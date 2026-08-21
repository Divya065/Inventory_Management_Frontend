using Project_1.Models;

namespace Project_1.Interface
{
    public interface ITransactionRepository
    {
        Task<List<Transaction>> GetAllAsync(string? userId = null);
        Task<(List<Transaction> Items, int TotalCount)> GetPagedAsync(
            string userId,
            string? type,
            DateTime? fromInclusive,
            DateTime? toExclusive,
            int page,
            int pageSize);
        Task<List<Transaction>> GetInRangeAsync(string userId, DateTime fromInclusive, DateTime toExclusive);
        Task<Transaction?> GetByIdAsync(int id);
        Task<Transaction> CreateAsync(Transaction transaction);
        Task<int> DeleteAllAsync(string userId);
        Task<bool> DeleteOneAsync(int id, string userId);
        Task<int> DeleteAllLoansAsync(string userId);
        Task<int> DeleteAllLoansForCustomerAsync(string userId, string customerName);
    }
}
