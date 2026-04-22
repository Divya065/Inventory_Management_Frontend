using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Project_1.Extentions;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/Portfolio")]
    [ApiController]
    public class PortfolioController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IStockRepository _stockRepo;
        private readonly IPortfolioRepository _portfolioRepo;
        public PortfolioController(UserManager<AppUser> userManager,
            IStockRepository stockRepo, IPortfolioRepository portfolioRepo)
        {
            _userManager = userManager;
            _stockRepo = stockRepo;
            _portfolioRepo = portfolioRepo;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetUserPortfolio()
        {
            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);
            var userPortfolio = await _portfolioRepo.GetUserPortfolio(appUser);
            return Ok(userPortfolio);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddPortfolio(string symbol, [FromQuery] int quantity = 1)
        {
            if (quantity < 1)
                quantity = 1;

            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);
            var stock = await _stockRepo.GetBySymbolAsync(symbol);

            if (stock == null)
                return BadRequest("Stock not found");

            int availableQty = stock.Quantity; // Inventory quantity
            if (quantity > availableQty)
                return BadRequest($"Quantity cannot exceed available inventory ({availableQty}).");

            var existing = await _portfolioRepo.GetByUserAndStockAsync(appUser.Id, stock.Id);
            if (existing != null)
            {
                int newTotal = existing.Quantity + quantity;
                if (newTotal > availableQty)
                    return BadRequest($"Total in cart would be {newTotal}, but only {availableQty} available in inventory.");
                existing.Quantity = newTotal;
                await _portfolioRepo.UpdateAsync(existing);
                return Created();
            }

            var portfolioModel = new Portfolio
            {
                StockID = stock.Id,
                AppUserId = appUser.Id,
                Quantity = quantity
            };
            await _portfolioRepo.CreateAsync(portfolioModel);

            if (portfolioModel == null)
                return StatusCode(500, "Could not create");

            return Created();
        }

        [HttpDelete]
        [Authorize]

        public async Task<IActionResult> DeletePortfolio(string symbol)
        {
            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);

            var userPortfolio = await _portfolioRepo.GetUserPortfolio(appUser);
            var filteredStock = userPortfolio.Where(s => s.Symbol.ToLower() == symbol.ToLower());

            // Check if the stock exists in the portfolio
            if (!filteredStock.Any())
            {
                return BadRequest("Stock not in your portfolio");
            }

            // Stock exists, so delete it
            var result = await _portfolioRepo.DeletePortfolio(appUser, symbol);
            
            if (result == null)
            {
                return BadRequest("Failed to remove stock from portfolio");
            }

            return Ok();
        }
    }
}
