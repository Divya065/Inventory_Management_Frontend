using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class PortfolioRepository : IPortfolioRepository
    {
        private readonly ApplicationDBContext _context;
        public PortfolioRepository(ApplicationDBContext context)
        {
            _context=context;
        }

        public async Task<Portfolio> CreateAsync(Portfolio portfolio)
        {
            await _context.AddAsync(portfolio);
            await _context.SaveChangesAsync();
            return portfolio;
        }

        public async Task<Portfolio?> GetByUserAndStockAsync(string userId, int stockId)
        {
            return await _context.Portfolios
                .FirstOrDefaultAsync(p => p.AppUserId == userId && p.StockID == stockId);
        }

        public async Task UpdateAsync(Portfolio portfolio)
        {
            _context.Portfolios.Update(portfolio);
            await _context.SaveChangesAsync();
        }

        public async Task<Portfolio> DeletePortfolio(AppUser appUser, string symbol)
        {
            var portfolioModel = await _context.Portfolios.FirstOrDefaultAsync(x => x.AppUserId == appUser.Id && x.Stock.Symbol.ToLower() == symbol.ToLower());

            if (portfolioModel == null)
            {
                return null;
            }

            _context.Portfolios.Remove(portfolioModel);
            await _context.SaveChangesAsync();
            return portfolioModel;
        }

        public async Task<List<Stock>> GetUserPortfolio(AppUser user)
        {
            return await _context.Portfolios
                .AsNoTracking()
                .Where(u => u.AppUserId == user.Id)
                .Select(p => new Stock
                {
                    Id = p.Stock.Id,
                    Symbol = p.Stock.Symbol,
                    CompanyName = p.Stock.CompanyName,
                    Price = p.Stock.Price,
                    Quantity = p.Quantity, // Cart quantity (how many user added)
                    MarketCap = p.Stock.MarketCap
                }).ToListAsync();
        }

        public async Task ClearUserPortfolioAsync(string userId)
        {
            var list = await _context.Portfolios.Where(p => p.AppUserId == userId).ToListAsync();
            _context.Portfolios.RemoveRange(list);
            await _context.SaveChangesAsync();
        }
    }
}
