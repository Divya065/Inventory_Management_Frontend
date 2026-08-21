using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Extentions;
using Project_1.Helpers;
using Project_1.Filters;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/Cart")]
    [ApiController]
    [RequireShopSubscription]
    public class CartController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IProductRepository _productRepo;
        private readonly ICartRepository _cartRepo;
        private readonly ApplicationDBContext _db;

        public CartController(
            UserManager<AppUser> userManager,
            IProductRepository productRepo,
            ICartRepository cartRepo,
            ApplicationDBContext db)
        {
            _userManager = userManager;
            _productRepo = productRepo;
            _cartRepo = cartRepo;
            _db = db;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetUserCart()
        {
            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);
            var cart = await _cartRepo.GetUserCart(appUser);
            return Ok(cart);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddToCart(string symbol, [FromQuery] int quantity = 1)
        {
            if (quantity < 1)
                quantity = 1;

            if (string.IsNullOrWhiteSpace(symbol))
                return BadRequest("SKU / barcode is required");

            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);
            if (appUser == null)
                return Unauthorized();
            var product = await _productRepo.GetBySymbolAsync(symbol.Trim(), appUser.Id);

            if (product == null)
                return BadRequest("Product not found");

            var deal = await _db.Offers
                .Where(o => o.ProductId == product.Id && (o.IsBuyOneGetOne || (o.BuyQty >= 1 && o.GetQty >= 1)))
                .OrderByDescending(o => o.CreatedOn)
                .FirstOrDefaultAsync();

            var buyQty = deal == null ? 0 : deal.EffectiveBuyQty;
            var getQty = deal == null ? 0 : deal.EffectiveGetQty;
            var paidQty = quantity;
            var physicalQty = BogoPricing.PhysicalQuantity(paidQty, buyQty, getQty);

            int availableQty = product.Quantity;
            if (physicalQty > availableQty)
            {
                if (BogoPricing.IsActiveDeal(buyQty, getQty))
                    return BadRequest($"{BogoPricing.DealLabel(buyQty, getQty)} needs {physicalQty} units in stock for paid quantity {paidQty}, but only {availableQty} available.");
                return BadRequest($"Quantity cannot exceed available inventory ({availableQty}).");
            }

            var existing = await _cartRepo.GetByUserAndProductAsync(appUser.Id, product.Id);
            if (existing != null)
            {
                int newTotal = existing.Quantity + physicalQty;
                if (newTotal > availableQty)
                    return BadRequest($"Total in cart would be {newTotal}, but only {availableQty} available in inventory.");
                existing.Quantity = newTotal;
                existing.PaidQuantity = (existing.PaidQuantity ?? 0) + paidQty;
                await _cartRepo.UpdateAsync(existing);
                return Created();
            }

            var cartItem = new CartItem
            {
                ProductID = product.Id,
                AppUserId = appUser.Id,
                Quantity = physicalQty,
                PaidQuantity = paidQty
            };
            await _cartRepo.CreateAsync(cartItem);
            return Created();
        }

        /// <summary>
        /// Set cart paid quantity for a symbol. paidQuantity &lt; 1 removes the line.
        /// Physical qty is recalculated from Buy-X-Get-Y offers.
        /// </summary>
        [HttpPut]
        [Authorize]
        public async Task<IActionResult> SetPaidQuantity(string symbol, [FromQuery] int paidQuantity)
        {
            if (string.IsNullOrWhiteSpace(symbol))
                return BadRequest("SKU / barcode is required");

            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);
            if (appUser == null)
                return Unauthorized();

            var product = await _productRepo.GetBySymbolAsync(symbol.Trim(), appUser.Id);
            if (product == null)
                return BadRequest("Product not found");

            var existing = await _cartRepo.GetByUserAndProductAsync(appUser.Id, product.Id);
            if (existing == null)
                return BadRequest("Item is not in your cart");

            if (paidQuantity < 1)
            {
                await _cartRepo.DeleteCartItem(appUser, product.Symbol);
                return Ok(new { message = "Item removed from cart." });
            }

            var deal = await _db.Offers
                .Where(o => o.ProductId == product.Id && (o.IsBuyOneGetOne || (o.BuyQty >= 1 && o.GetQty >= 1)))
                .OrderByDescending(o => o.CreatedOn)
                .FirstOrDefaultAsync();

            var buyQty = deal == null ? 0 : deal.EffectiveBuyQty;
            var getQty = deal == null ? 0 : deal.EffectiveGetQty;
            var physicalQty = BogoPricing.PhysicalQuantity(paidQuantity, buyQty, getQty);

            if (physicalQty > product.Quantity)
            {
                if (BogoPricing.IsActiveDeal(buyQty, getQty))
                    return BadRequest($"{BogoPricing.DealLabel(buyQty, getQty)} needs {physicalQty} units in stock for paid quantity {paidQuantity}, but only {product.Quantity} available.");
                return BadRequest($"Quantity cannot exceed available inventory ({product.Quantity}).");
            }

            existing.Quantity = physicalQty;
            existing.PaidQuantity = paidQuantity;
            await _cartRepo.UpdateAsync(existing);
            return Ok(new { message = "Cart quantity updated.", quantity = physicalQty, paidQuantity });
        }

        [HttpDelete]
        [Authorize]
        public async Task<IActionResult> RemoveFromCart(string symbol)
        {
            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);

            var cart = await _cartRepo.GetUserCart(appUser);
            var filteredStock = cart.Where(s => s.Symbol.ToLower() == symbol.ToLower());

            if (!filteredStock.Any())
                return BadRequest("Item is not in your cart");

            var result = await _cartRepo.DeleteCartItem(appUser, symbol);
            if (result == null)
                return BadRequest("Failed to remove item from cart");

            return Ok();
        }
    }
}
