using Project_1.Models;

namespace Project_1.Interface
{
    public interface IPortfolioRepository
    {
        Task<List<Stock>> GetUserPortfolio(AppUser user);
        Task<Portfolio?> GetByUserAndStockAsync(string userId, int stockId);
        Task<Portfolio> CreateAsync(Portfolio portfolio);
        Task UpdateAsync(Portfolio portfolio);
        Task<Portfolio> DeletePortfolio(AppUser appUser, string symbol);
        Task ClearUserPortfolioAsync(string userId);
    }
}
