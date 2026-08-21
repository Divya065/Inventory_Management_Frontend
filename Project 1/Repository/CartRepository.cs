using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Dtos.Cart;
using Project_1.Helpers;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class CartRepository : ICartRepository
    {
        private readonly ApplicationDBContext _context;
        public CartRepository(ApplicationDBContext context)
        {
            _context = context;
        }

        public async Task<CartItem> CreateAsync(CartItem cartItem)
        {
            await _context.AddAsync(cartItem);
            await _context.SaveChangesAsync();
            return cartItem;
        }

        public async Task<CartItem?> GetByUserAndProductAsync(string userId, int productId)
        {
            return await _context.CartItems
                .FirstOrDefaultAsync(p => p.AppUserId == userId && p.ProductID == productId);
        }

        public async Task UpdateAsync(CartItem cartItem)
        {
            _context.CartItems.Update(cartItem);
            await _context.SaveChangesAsync();
        }

        public async Task<CartItem?> DeleteCartItem(AppUser appUser, string symbol)
        {
            var row = await _context.CartItems.FirstOrDefaultAsync(x =>
                x.AppUserId == appUser.Id && x.Product.Symbol.ToLower() == symbol.ToLower());

            if (row == null)
                return null;

            _context.CartItems.Remove(row);
            await _context.SaveChangesAsync();
            return row;
        }

        public async Task<List<CartItemDto>> GetUserCart(AppUser user)
        {
            var rows = await _context.CartItems
                .AsNoTracking()
                .Where(u => u.AppUserId == user.Id)
                .Select(p => new
                {
                    p.Product.Id,
                    p.Product.Symbol,
                    p.Product.Brand,
                    p.Product.CompanyName,
                    p.Product.Barcode,
                    p.Product.Price,
                    CartQty = p.Quantity,
                    PaidQty = p.PaidQuantity,
                    AvailableQty = p.Product.Quantity,
                    p.Product.MarketCap,
                    p.Product.ExpiryDate,
                    Deal = p.Product.Offers
                        .Where(o => o.BuyQty >= 1 && o.GetQty >= 1 || o.IsBuyOneGetOne)
                        .OrderByDescending(o => o.CreatedOn)
                        .Select(o => new { o.Title, o.BuyQty, o.GetQty, o.IsBuyOneGetOne })
                        .FirstOrDefault(),
                    PctOffer = p.Product.Offers
                        .Where(o => o.DiscountPercent > 0)
                        .OrderByDescending(o => o.CreatedOn)
                        .Select(o => new { o.Title, o.DiscountPercent })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return rows.Select(r =>
            {
                var buy = r.Deal == null ? 0 : (r.Deal.BuyQty >= 1 ? r.Deal.BuyQty : (r.Deal.IsBuyOneGetOne ? 1 : 0));
                var get = r.Deal == null ? 0 : (r.Deal.GetQty >= 1 ? r.Deal.GetQty : (r.Deal.IsBuyOneGetOne ? 1 : 0));
                var hasDeal = BogoPricing.IsActiveDeal(buy, get);
                var qty = r.CartQty < 1 ? 1 : r.CartQty;
                int chargeable;
                if (r.PaidQty.HasValue && r.PaidQty.Value > 0)
                    chargeable = r.PaidQty.Value;
                else if (hasDeal && buy == 1 && get == 1)
                    chargeable = BogoPricing.ChargeableQuantity(qty, true);
                else
                    chargeable = qty;

                string? offerTitle = null;
                if (hasDeal)
                    offerTitle = string.IsNullOrWhiteSpace(r.Deal!.Title) ? BogoPricing.DealLabel(buy, get) : r.Deal.Title;
                else if (r.PctOffer != null && r.PctOffer.DiscountPercent > 0)
                    offerTitle = string.IsNullOrWhiteSpace(r.PctOffer.Title)
                        ? $"{r.PctOffer.DiscountPercent:0.##}% off"
                        : r.PctOffer.Title;

                return new CartItemDto
                {
                    Id = r.Id,
                    Symbol = r.Symbol,
                    Brand = r.Brand,
                    CompanyName = r.CompanyName,
                    Barcode = r.Barcode,
                    Price = r.Price,
                    Quantity = qty,
                    AvailableQuantity = r.AvailableQty,
                    MarketCap = r.MarketCap,
                    BuyQty = buy,
                    GetQty = get,
                    IsBuyOneGetOne = buy == 1 && get == 1,
                    OfferTitle = offerTitle,
                    ChargeableQuantity = chargeable,
                    ExpiryDate = r.ExpiryDate,
                    ExpiryStatus = ExpiryFreshness.Status(r.ExpiryDate),
                };
            }).ToList();
        }

        public async Task ClearUserCartAsync(string userId)
        {
            var list = await _context.CartItems.Where(p => p.AppUserId == userId).ToListAsync();
            _context.CartItems.RemoveRange(list);
            await _context.SaveChangesAsync();
        }
    }
}
