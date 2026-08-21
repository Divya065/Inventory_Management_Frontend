using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Project_1.Dtos.Cart;
using Project_1.Extentions;
using Project_1.Helpers;
using Project_1.Filters;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/cart")]
    [ApiController]
    [Authorize]
    [RequireShopSubscription]
    public class CartParkingController : ControllerBase
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        private readonly UserManager<AppUser> _userManager;
        private readonly ICartRepository _cartRepo;
        private readonly ICartParkingRepository _cartParkingRepo;
        private readonly IProductRepository _productRepo;

        public CartParkingController(
            UserManager<AppUser> userManager,
            ICartRepository cartRepo,
            ICartParkingRepository cartParkingRepo,
            IProductRepository productRepo)
        {
            _userManager = userManager;
            _cartRepo = cartRepo;
            _cartParkingRepo = cartParkingRepo;
            _productRepo = productRepo;
        }

        [HttpGet("workspace")]
        public async Task<IActionResult> GetWorkspace()
        {
            var appUser = await GetCurrentUserAsync();
            if (appUser == null)
                return Unauthorized(new { message = "Could not determine current user." });

            var items = await _cartRepo.GetUserCart(appUser);
            var state = await _cartParkingRepo.GetCartStateAsync(appUser.Id);
            var parked = await _cartParkingRepo.GetParkedCartsAsync(appUser.Id);

            var activeName = string.IsNullOrWhiteSpace(state?.ActiveCustomerName)
                ? null
                : state!.ActiveCustomerName!.Trim();

            return Ok(new CartWorkspaceDto
            {
                Active = new ActiveCartSummaryDto
                {
                    CustomerName = activeName,
                    ItemCount = items.Sum(i => i.Quantity > 0 ? i.Quantity : 1),
                    EstimatedTotal = items.Sum(i => i.Price * (i.ChargeableQuantity > 0 ? i.ChargeableQuantity : 1)),
                    HasSavedCustomerName = !string.IsNullOrWhiteSpace(activeName),
                },
                Parked = parked.Select(p => new ParkedCartSummaryDto
                {
                    Id = p.Id,
                    CustomerName = p.CustomerName,
                    ItemCount = p.ItemCount,
                    EstimatedTotal = p.EstimatedTotal,
                    CreatedOn = p.CreatedOn,
                }).ToList(),
            });
        }

        [HttpPost("park")]
        public async Task<IActionResult> Park([FromBody] ParkCartRequestDto? dto)
        {
            var appUser = await GetCurrentUserAsync();
            if (appUser == null)
                return Unauthorized(new { message = "Could not determine current user." });

            if (!CustomerNameValidation.TryValidate(dto?.CustomerName, out var customerName, out var nameError))
                return BadRequest(new { message = nameError });

            var items = await _cartRepo.GetUserCart(appUser);
            if (items == null || items.Count == 0)
                return BadRequest(new { message = "Active cart is empty. Add items before parking." });

            if (await _cartParkingRepo.ParkedNameExistsAsync(appUser.Id, customerName))
                return BadRequest(new { message = $"A parked cart for \"{customerName}\" already exists. Resume or rename." });

            var state = await _cartParkingRepo.GetCartStateAsync(appUser.Id);
            if (!string.IsNullOrWhiteSpace(state?.ActiveCustomerName) &&
                !string.Equals(state.ActiveCustomerName.Trim(), customerName, StringComparison.OrdinalIgnoreCase) &&
                await _cartParkingRepo.ParkedNameExistsAsync(appUser.Id, state.ActiveCustomerName.Trim()))
            {
                // ok — different name
            }

            var payload = items.Select(i => new ParkedCartItemDto
            {
                ProductId = i.Id,
                Symbol = i.Symbol,
                Quantity = i.Quantity > 0 ? i.Quantity : 1,
            }).ToList();

            var parked = new ParkedCart
            {
                AppUserId = appUser.Id,
                CustomerName = customerName,
                ItemsJson = JsonSerializer.Serialize(payload, JsonOptions),
                ItemCount = payload.Sum(p => p.Quantity),
                EstimatedTotal = items.Sum(i => i.Price * (i.ChargeableQuantity > 0 ? i.ChargeableQuantity : 1)),
                CreatedOn = DateTime.UtcNow,
            };

            await _cartParkingRepo.CreateParkedCartAsync(parked);
            await _cartRepo.ClearUserCartAsync(appUser.Id);
            await _cartParkingRepo.ClearActiveCustomerNameAsync(appUser.Id);

            return Ok(new
            {
                message = $"Cart parked for {customerName}.",
                parked = new ParkedCartSummaryDto
                {
                    Id = parked.Id,
                    CustomerName = parked.CustomerName,
                    ItemCount = parked.ItemCount,
                    EstimatedTotal = parked.EstimatedTotal,
                    CreatedOn = parked.CreatedOn,
                },
            });
        }

        [HttpPost("resume/{id:int}")]
        public async Task<IActionResult> Resume([FromRoute] int id)
        {
            var appUser = await GetCurrentUserAsync();
            if (appUser == null)
                return Unauthorized(new { message = "Could not determine current user." });

            var parked = await _cartParkingRepo.GetParkedCartAsync(id, appUser.Id);
            if (parked == null)
                return NotFound(new { message = "Parked cart not found." });

            var activeItems = await _cartRepo.GetUserCart(appUser);
            if (activeItems != null && activeItems.Count > 0)
                return BadRequest(new { message = "Active cart has items. Park or clear it before resuming another cart." });

            List<ParkedCartItemDto>? lines;
            try
            {
                lines = JsonSerializer.Deserialize<List<ParkedCartItemDto>>(parked.ItemsJson, JsonOptions);
            }
            catch
            {
                return BadRequest(new { message = "Parked cart data is invalid." });
            }

            if (lines == null || lines.Count == 0)
                return BadRequest(new { message = "Parked cart has no items." });

            foreach (var line in lines)
            {
                var product = line.ProductId > 0
                    ? await _productRepo.GetByIdAsync(line.ProductId, appUser.Id)
                    : await _productRepo.GetBySymbolAsync(line.Symbol, appUser.Id);

                if (product == null)
                    return BadRequest(new { message = $"Item \"{line.Symbol}\" is no longer in inventory." });

                var qty = line.Quantity < 1 ? 1 : line.Quantity;
                if (qty > product.Quantity)
                    return BadRequest(new { message = $"Only {product.Quantity} left for \"{(string.IsNullOrWhiteSpace(product.CompanyName) ? product.Symbol : product.CompanyName)}\". Parked cart needs {qty}." });

                var existing = await _cartRepo.GetByUserAndProductAsync(appUser.Id, product.Id);
                if (existing != null)
                {
                    existing.Quantity = qty;
                    await _cartRepo.UpdateAsync(existing);
                }
                else
                {
                    await _cartRepo.CreateAsync(new CartItem
                    {
                        AppUserId = appUser.Id,
                        ProductID = product.Id,
                        Quantity = qty,
                    });
                }
            }

            await _cartParkingRepo.SetActiveCustomerNameAsync(appUser.Id, parked.CustomerName);
            await _cartParkingRepo.DeleteParkedCartAsync(parked);

            return Ok(new
            {
                message = $"Resumed cart for {parked.CustomerName}.",
                customerName = parked.CustomerName,
            });
        }

        [HttpDelete("parked/{id:int}")]
        public async Task<IActionResult> DiscardParked([FromRoute] int id)
        {
            var appUser = await GetCurrentUserAsync();
            if (appUser == null)
                return Unauthorized(new { message = "Could not determine current user." });

            var parked = await _cartParkingRepo.GetParkedCartAsync(id, appUser.Id);
            if (parked == null)
                return NotFound(new { message = "Parked cart not found." });

            await _cartParkingRepo.DeleteParkedCartAsync(parked);
            return Ok(new { message = "Parked cart discarded." });
        }

        [HttpPost("active-customer")]
        public async Task<IActionResult> SetActiveCustomer([FromBody] ParkCartRequestDto? dto)
        {
            var appUser = await GetCurrentUserAsync();
            if (appUser == null)
                return Unauthorized(new { message = "Could not determine current user." });

            if (dto == null || string.IsNullOrWhiteSpace(dto.CustomerName))
            {
                await _cartParkingRepo.ClearActiveCustomerNameAsync(appUser.Id);
                return Ok(new { customerName = (string?)null });
            }

            if (!CustomerNameValidation.TryValidate(dto.CustomerName, out var customerName, out var nameError))
                return BadRequest(new { message = nameError });

            await _cartParkingRepo.SetActiveCustomerNameAsync(appUser.Id, customerName);
            return Ok(new { customerName });
        }

        private async Task<AppUser?> GetCurrentUserAsync()
        {
            var username = User.GetUsername();
            if (string.IsNullOrEmpty(username)) return null;
            return await _userManager.FindByNameAsync(username);
        }
    }
}
