using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class TransactionRepository : ITransactionRepository
    {
        private readonly ApplicationDBContext _context;

        public TransactionRepository(ApplicationDBContext context)
        {
            _context = context;
        }

        public async Task<Transaction> CreateAsync(Transaction transaction)
        {
            await _context.Transactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
            return transaction;
        }

        public async Task<List<Transaction>> GetAllAsync(string? userId = null)
        {
            var query = _context.Transactions.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(userId))
                query = query.Where(t => t.AppUserId == userId);
            else
                return new List<Transaction>();
            return await query.OrderByDescending(t => t.CreatedOn).ToListAsync();
        }

        public async Task<Transaction?> GetByIdAsync(int id)
        {
            return await _context.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<int> DeleteAllAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return 0;

            // EF Core 8: deletes in DB without loading entities
            return await _context.Transactions
                .Where(t => t.AppUserId == userId)
                .ExecuteDeleteAsync();
        }

        public async Task<bool> DeleteOneAsync(int id, string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return false;

            var deleted = await _context.Transactions
                .Where(t => t.Id == id && t.AppUserId == userId)
                .ExecuteDeleteAsync();

            return deleted > 0;
        }

        public async Task<int> DeleteAllLoansAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return 0;

            return await _context.Transactions
                .Where(t => t.AppUserId == userId &&
                    (t.Type == "Loan" || t.Type == "LoanPayment"))
                .ExecuteDeleteAsync();
        }

        public async Task<int> DeleteAllLoansForCustomerAsync(string userId, string customerName)
        {
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(customerName))
                return 0;

            return await _context.Transactions
                .Where(t => t.AppUserId == userId &&
                    (t.Type == "Loan" || t.Type == "LoanPayment") &&
                    t.CustomerName != null && t.CustomerName.Trim().ToLower() == customerName.Trim().ToLower())
                .ExecuteDeleteAsync();
        }
    }
}
