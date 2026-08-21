using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Project_1.Dtos.Product;
using Project_1.Helpers;
using Project_1.Interface;
using Project_1.Mappers;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/Product")]
    [Route("api/Stock")]
    [ApiController]
    [Authorize]
    public class ProductController : ControllerBase
    {
        private readonly IProductRepository _productRepo;
        private readonly UserManager<AppUser> _userManager;

        public ProductController(IProductRepository productRepo, UserManager<AppUser> userManager)
        {
            _productRepo = productRepo;
            _userManager = userManager;
        }

        [HttpGet]
        [ResponseCache(NoStore = true, Duration = 0, Location = ResponseCacheLocation.None)]
        public async Task<IActionResult> GetAll([FromQuery] QuerryObject querry)
        {
            try
            {
                var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
                if (error != null) return error;

                if (querry == null)
                    querry = new QuerryObject();
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                var products = await _productRepo.GetAllAsync(querry, shop!.Id);
                return Ok(products.Select(s => s.ToProductDto()).ToList());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Product GetAll error: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = "Error loading inventory.", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
            if (error != null) return error;
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var product = await _productRepo.GetByIdAsync(id, shop!.Id);

            if (product == null)
            {
                return NotFound();
            }
            return Ok(product.ToProductDto());
        }

        [HttpGet("by-symbol/{symbol}")]
        public async Task<IActionResult> GetBySymbol([FromRoute] string symbol)
        {
            var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
            if (error != null) return error;
            if (string.IsNullOrWhiteSpace(symbol))
                return BadRequest(new { message = "Internal code is required." });

            var product = await _productRepo.GetBySymbolAsync(symbol, shop!.Id);
            if (product == null)
                return NotFound(new { message = "No item found for this code." });

            return Ok(product.ToProductDto());
        }

        [HttpGet("by-barcode/{barcode}")]
        public async Task<IActionResult> GetByBarcode([FromRoute] string barcode)
        {
            var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
            if (error != null) return error;
            if (string.IsNullOrWhiteSpace(barcode))
                return BadRequest(new { message = "Barcode is required." });

            var product = await _productRepo.GetByBarcodeAsync(barcode, shop!.Id);
            if (product == null)
                return NotFound(new { message = "No item found for this barcode. Add the barcode on the product first." });

            return Ok(product.ToProductDto());
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProductRequestDto productDto)
        {
            var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
            if (error != null) return error;
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            if (!StockPriceValidation.TryValidate(productDto.Price, productDto.MarketCap, out var priceError))
                return BadRequest(new { message = priceError });

            if (!string.IsNullOrWhiteSpace(productDto.Barcode))
            {
                var barcode = productDto.Barcode.Trim();
                if (await _productRepo.BarcodeExistsAsync(barcode, shop!.Id))
                    return BadRequest(new { message = $"Barcode \"{barcode}\" is already used by another item." });
            }

            var productModel = productDto.ToCreateFromProductDto();
            productModel.OwnerUserId = shop!.Id;
            await _productRepo.CreateAsync(productModel);
            return CreatedAtAction(nameof(GetById), new { id = productModel.Id }, productModel.ToProductDto());
        }

        [HttpPut]
        [Route("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateProductDto updateDto)
        {
            var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
            if (error != null) return error;
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            if (!StockPriceValidation.TryValidate(updateDto.Price, updateDto.MarketCap, out var priceError))
                return BadRequest(new { message = priceError });

            if (!string.IsNullOrWhiteSpace(updateDto.Barcode))
            {
                var barcode = updateDto.Barcode.Trim();
                if (await _productRepo.BarcodeExistsAsync(barcode, shop!.Id, id))
                    return BadRequest(new { message = $"Barcode \"{barcode}\" is already used by another item." });
            }

            var productModel = await _productRepo.UpdateAsync(id, updateDto, shop!.Id);

            if (productModel == null)
            {
                return NotFound();
            }

            return Ok(productModel.ToProductDto());
        }

        [HttpDelete]
        [Route("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id)
        {
            try
            {
                var (shop, error) = await ShopUserHelper.GetActiveShopUserAsync(this, _userManager);
                if (error != null) return error;
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                var productModel = await _productRepo.DeleteAsync(id, shop!.Id);

                if (productModel == null)
                {
                    return NotFound();
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Product Delete error: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"Inner: {ex.InnerException.Message}");
                return StatusCode(500, new { message = "Error deleting item.", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}
