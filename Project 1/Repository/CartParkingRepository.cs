using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class CartParkingRepository : ICartParkingRepository
    {
        private readonly ApplicationDBContext _context;

        public CartParkingRepository(ApplicationDBContext context)
        {
            _context = context;
        }

        public async Task<CartState?> GetCartStateAsync(string userId)
        {
            return await _context.CartStates.FirstOrDefaultAsync(c => c.AppUserId == userId);
        }

        public async Task SetActiveCustomerNameAsync(string userId, string? customerName)
        {
            var state = await _context.CartStates.FirstOrDefaultAsync(c => c.AppUserId == userId);
            if (state == null)
            {
                state = new CartState { AppUserId = userId, ActiveCustomerName = customerName };
                await _context.CartStates.AddAsync(state);
            }
            else
            {
                state.ActiveCustomerName = customerName;
            }
            await _context.SaveChangesAsync();
        }

        public async Task ClearActiveCustomerNameAsync(string userId)
        {
            var state = await _context.CartStates.FirstOrDefaultAsync(c => c.AppUserId == userId);
            if (state == null) return;
            state.ActiveCustomerName = null;
            await _context.SaveChangesAsync();
        }

        public async Task<List<ParkedCart>> GetParkedCartsAsync(string userId)
        {
            return await _context.ParkedCarts
                .AsNoTracking()
                .Where(p => p.AppUserId == userId)
                .OrderByDescending(p => p.CreatedOn)
                .ToListAsync();
        }

        public async Task<ParkedCart?> GetParkedCartAsync(int id, string userId)
        {
            return await _context.ParkedCarts
                .FirstOrDefaultAsync(p => p.Id == id && p.AppUserId == userId);
        }

        public async Task<ParkedCart> CreateParkedCartAsync(ParkedCart parked)
        {
            await _context.ParkedCarts.AddAsync(parked);
            await _context.SaveChangesAsync();
            return parked;
        }

        public async Task DeleteParkedCartAsync(ParkedCart parked)
        {
            _context.ParkedCarts.Remove(parked);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ParkedNameExistsAsync(string userId, string customerName, int? excludeId = null)
        {
            var name = customerName.Trim();
            var query = _context.ParkedCarts.Where(p =>
                p.AppUserId == userId &&
                p.CustomerName.ToLower() == name.ToLower());
            if (excludeId.HasValue)
                query = query.Where(p => p.Id != excludeId.Value);
            return await query.AnyAsync();
        }
    }
}
