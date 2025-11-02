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
            IStockRepository stockRepo,IPortfolioRepository portfolioRepo)
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
        public async Task<IActionResult> AddPortfolio(string symbol)
        {
            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);
            var stock = await _stockRepo.GetBySymbolAsync(symbol);

            if (stock == null)
                return BadRequest("Stock not found");

            var userPortfolio = await _portfolioRepo.GetUserPortfolio(appUser);

            if (userPortfolio.Any(e => e.Symbol.ToLower() == symbol.ToLower()))
                return BadRequest("Cannot add the samestock to portfolio");
            
            var portfolioModel= new Portfolio
            {
                StockID = stock.Id,
                AppUserId = appUser.Id
            };
            await _portfolioRepo.CreateAsync(portfolioModel);

            if (portfolioModel == null)
            {
                return StatusCode(500, "Could not create");
            }
            else
            {
                return Created();
            }
        }

        [HttpDelete]
        [Authorize]

        public async Task<IActionResult> DeletePortfolio(string symbol)
        {
            var user = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(user);

            var userPortfolio = await _portfolioRepo.GetUserPortfolio(appUser);
            var filteredStock = userPortfolio.Where(s => s.Symbol.ToLower() == symbol.ToLower());

            if(filteredStock==null)
            {
                await _portfolioRepo.DeletePortfolio(appUser,symbol);
            }
            else
            {
                return BadRequest("Stock not in your portfolio");
            }
            return Ok();
        }
    }
}
