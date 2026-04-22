using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Dtos.Stock;
using Project_1.Helpers;
using Project_1.Interface;
using Project_1.Mappers;
using Project_1.Models;

namespace Project_1.Repository
{
    public class StockRepository : IStockRepository
    {
        private readonly ApplicationDBContext _context;
        public StockRepository(ApplicationDBContext context)
        {
            _context=context;
        }

        public async Task<Stock?> DeleteAsync(int id)
        {
            var stockModel = await _context.Stocks.FirstOrDefaultAsync(x => x.Id == id);

            if (stockModel == null)
            {
                return null;
            }

            // Remove related Offers and Portfolios first (FK constraints)
            var offersToRemove = await _context.Offers.Where(o => o.StockId == id).ToListAsync();
            _context.Offers.RemoveRange(offersToRemove);

            var portfoliosToRemove = await _context.Portfolios.Where(p => p.StockID == id).ToListAsync();
            _context.Portfolios.RemoveRange(portfoliosToRemove);

            _context.Stocks.Remove(stockModel);
            await _context.SaveChangesAsync();
            return stockModel;
        }

        public async Task<List<Stock>> GetAllAsync(QuerryObject querry)
        {
            var stocks= _context.Stocks.Include(c => c.Offers).ThenInclude(a => a.AppUser).AsQueryable();

            if(!string.IsNullOrWhiteSpace(querry.CompanyName))
            {
                stocks=stocks.Where(s=>s.CompanyName.Contains(querry.CompanyName));
            }

            if(!string.IsNullOrWhiteSpace(querry.Symbol))
            {
                stocks=stocks.Where(s=>s.Symbol.Contains(querry.Symbol));
            }

            if(!string.IsNullOrWhiteSpace(querry.SortBy))
            {
                if(querry.SortBy.Equals("Symbol", StringComparison.OrdinalIgnoreCase))
                {
                    stocks = querry.IsDecending ? stocks.OrderByDescending(s => s.Symbol) : stocks.OrderBy(s => s.Symbol);
                }
            }

            var skipNumber=(querry.PageNumber - 1) * querry.PageSize;
            return await stocks.Skip(skipNumber).Take(querry.PageSize).ToListAsync();
        }

        public async Task<Stock?> GetByIdAsync(int id)
        {
            return await _context.Stocks.Include(c => c.Offers).FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<Stock?> UpdateAsync(int id, UpdateStockDto stockDto)
        {
            var existing_Stock= await _context.Stocks.FirstOrDefaultAsync(x => x.Id == id);
            if(existing_Stock==null)
            {
                return null;
            }
            existing_Stock.Symbol = stockDto.Symbol;
            existing_Stock.CompanyName = stockDto.CompanyName;
            existing_Stock.Price = stockDto.Price;
            existing_Stock.Quantity = stockDto.Quantity;
            existing_Stock.MarketCap = stockDto.MarketCap;

            await _context.SaveChangesAsync();
            return existing_Stock;
        }

        public async Task<Stock> CreateAsync(Stock stockModel)
        {
            await _context.Stocks.AddAsync(stockModel);
            await _context.SaveChangesAsync();
            return stockModel;
        }

        public Task<bool> stockExist(int id)
        {
            return _context.Stocks.AnyAsync(s=>s.Id==id);
        }

        public async Task<Stock?> GetBySymbolAsync(string symbol)
        {
            return await _context.Stocks.FirstOrDefaultAsync(s => s.Symbol == symbol);
        }

        public async Task<bool> ReduceQuantityAsync(int stockId, int amount)
        {
            // Use ExecuteUpdateAsync so the change is applied directly in the database
            // and is not affected by EF tracking of entities loaded earlier in the request.
            var rowsAffected = await _context.Stocks
                .Where(s => s.Id == stockId)
                .ExecuteUpdateAsync(updater =>
                    updater.SetProperty(
                        s => s.Quantity,
                        s => (s.Quantity - amount) < 0 ? 0 : (s.Quantity - amount)));

            return rowsAffected > 0;
        }
    }
}
