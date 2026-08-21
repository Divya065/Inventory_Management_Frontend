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

        public async Task<(List<Transaction> Items, int TotalCount)> GetPagedAsync(
            string userId,
            string? type,
            DateTime? fromInclusive,
            DateTime? toExclusive,
            int page,
            int pageSize)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return (new List<Transaction>(), 0);

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Transactions.AsNoTracking().Where(t => t.AppUserId == userId);

            if (!string.IsNullOrWhiteSpace(type))
            {
                var t = type.Trim();
                query = query.Where(x => x.Type != null && x.Type.ToLower() == t.ToLower());
            }

            if (fromInclusive.HasValue)
                query = query.Where(x => x.CreatedOn >= fromInclusive.Value);

            if (toExclusive.HasValue)
                query = query.Where(x => x.CreatedOn < toExclusive.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.CreatedOn)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<List<Transaction>> GetInRangeAsync(string userId, DateTime fromInclusive, DateTime toExclusive)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return new List<Transaction>();

            return await _context.Transactions
                .AsNoTracking()
                .Where(t => t.AppUserId == userId
                    && t.CreatedOn >= fromInclusive
                    && t.CreatedOn < toExclusive)
                .OrderByDescending(t => t.CreatedOn)
                .ToListAsync();
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
