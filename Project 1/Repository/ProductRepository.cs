using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Dtos.Product;
using Project_1.Helpers;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class ProductRepository : IProductRepository
    {
        private readonly ApplicationDBContext _context;
        public ProductRepository(ApplicationDBContext context)
        {
            _context = context;
        }

        private IQueryable<Product> Owned(string ownerUserId) =>
            _context.Products.Where(p => p.OwnerUserId == ownerUserId);

        public async Task<Product?> DeleteAsync(int id, string ownerUserId)
        {
            var productModel = await Owned(ownerUserId).FirstOrDefaultAsync(x => x.Id == id);

            if (productModel == null)
            {
                return null;
            }

            var offersToRemove = await _context.Offers.Where(o => o.ProductId == id).ToListAsync();
            _context.Offers.RemoveRange(offersToRemove);

            var cartItemsToRemove = await _context.CartItems.Where(p => p.ProductID == id).ToListAsync();
            _context.CartItems.RemoveRange(cartItemsToRemove);

            _context.Products.Remove(productModel);
            await _context.SaveChangesAsync();
            return productModel;
        }

        public async Task<List<Product>> GetAllAsync(QuerryObject querry, string ownerUserId)
        {
            var products = Owned(ownerUserId)
                .AsNoTracking()
                .Include(c => c.Offers)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(querry.Search))
            {
                var q = querry.Search.Trim().ToLower();
                products = products.Where(s =>
                    s.CompanyName.ToLower().Contains(q) ||
                    (s.Brand != null && s.Brand.ToLower().Contains(q)));
            }

            if (!string.IsNullOrWhiteSpace(querry.CompanyName))
            {
                var name = querry.CompanyName.Trim().ToLower();
                products = products.Where(s => s.CompanyName.ToLower().Contains(name));
            }

            if (!string.IsNullOrWhiteSpace(querry.Brand))
            {
                var brand = querry.Brand.Trim().ToLower();
                products = products.Where(s => s.Brand != null && s.Brand.ToLower().Contains(brand));
            }

            if (!string.IsNullOrWhiteSpace(querry.Symbol))
            {
                products = products.Where(s => s.Symbol.Contains(querry.Symbol));
            }

            if (!string.IsNullOrWhiteSpace(querry.SortBy))
            {
                if (querry.SortBy.Equals("Brand", StringComparison.OrdinalIgnoreCase))
                {
                    products = querry.IsDecending
                        ? products.OrderByDescending(s => s.Brand)
                        : products.OrderBy(s => s.Brand);
                }
                else if (querry.SortBy.Equals("CompanyName", StringComparison.OrdinalIgnoreCase))
                {
                    products = querry.IsDecending
                        ? products.OrderByDescending(s => s.CompanyName)
                        : products.OrderBy(s => s.CompanyName);
                }
                else if (querry.SortBy.Equals("Symbol", StringComparison.OrdinalIgnoreCase))
                {
                    products = querry.IsDecending ? products.OrderByDescending(s => s.Symbol) : products.OrderBy(s => s.Symbol);
                }
            }

            var skipNumber = (querry.PageNumber - 1) * querry.PageSize;
            return await products.Skip(skipNumber).Take(querry.PageSize).ToListAsync();
        }

        public async Task<Product?> GetByIdAsync(int id, string ownerUserId)
        {
            return await Owned(ownerUserId)
                .AsNoTracking()
                .Include(c => c.Offers)
                .ThenInclude(a => a.AppUser)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<Product?> UpdateAsync(int id, UpdateProductDto productDto, string ownerUserId)
        {
            var existing = await Owned(ownerUserId).FirstOrDefaultAsync(x => x.Id == id);
            if (existing == null)
            {
                return null;
            }
            existing.Symbol = productDto.Symbol;
            existing.Brand = string.IsNullOrWhiteSpace(productDto.Brand) ? null : productDto.Brand.Trim();
            existing.CompanyName = productDto.CompanyName;
            existing.Barcode = string.IsNullOrWhiteSpace(productDto.Barcode) ? null : productDto.Barcode.Trim();
            existing.Price = productDto.Price;
            existing.Quantity = productDto.Quantity;
            existing.MarketCap = productDto.MarketCap;
            existing.ExpiryDate = productDto.ExpiryDate;

            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<Product> CreateAsync(Product productModel)
        {
            await _context.Products.AddAsync(productModel);
            await _context.SaveChangesAsync();
            return productModel;
        }

        public Task<bool> ProductExists(int id, string ownerUserId)
        {
            return Owned(ownerUserId).AnyAsync(s => s.Id == id);
        }

        public async Task<Product?> GetBySymbolAsync(string symbol, string ownerUserId)
        {
            if (string.IsNullOrWhiteSpace(symbol))
                return null;

            var code = symbol.Trim().ToLower();
            return await Owned(ownerUserId)
                .Include(s => s.Offers)
                .FirstOrDefaultAsync(s =>
                    s.Symbol.ToLower() == code
                    || (s.Barcode != null && s.Barcode.ToLower() == code));
        }

        public async Task<Product?> GetByBarcodeAsync(string barcode, string ownerUserId)
        {
            if (string.IsNullOrWhiteSpace(barcode))
                return null;

            var code = barcode.Trim();
            return await Owned(ownerUserId)
                .Include(s => s.Offers)
                .FirstOrDefaultAsync(s =>
                s.Barcode != null && s.Barcode.ToLower() == code.ToLower());
        }

        public async Task<bool> BarcodeExistsAsync(string barcode, string ownerUserId, int? excludeProductId = null)
        {
            if (string.IsNullOrWhiteSpace(barcode))
                return false;

            var code = barcode.Trim().ToLower();
            var query = Owned(ownerUserId).Where(s => s.Barcode != null && s.Barcode.ToLower() == code);
            if (excludeProductId.HasValue)
                query = query.Where(s => s.Id != excludeProductId.Value);
            return await query.AnyAsync();
        }

        public async Task<bool> ReduceQuantityAsync(int productId, int amount, string ownerUserId)
        {
            var rowsAffected = await Owned(ownerUserId)
                .Where(s => s.Id == productId)
                .ExecuteUpdateAsync(updater =>
                    updater.SetProperty(
                        s => s.Quantity,
                        s => (s.Quantity - amount) < 0 ? 0 : (s.Quantity - amount)));

            return rowsAffected > 0;
        }

        public async Task<bool> IncreaseQuantityAsync(int productId, int amount, string ownerUserId)
        {
            if (amount < 1) return false;
            var rowsAffected = await Owned(ownerUserId)
                .Where(s => s.Id == productId)
                .ExecuteUpdateAsync(updater =>
                    updater.SetProperty(s => s.Quantity, s => s.Quantity + amount));
            return rowsAffected > 0;
        }
    }
}
