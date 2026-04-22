using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class OfferRepository : IOfferRepository
    {
        private readonly ApplicationDBContext _context;
        public OfferRepository(ApplicationDBContext context) { _context = context; }

        public async Task<Offer> CreateAsync(Offer m)
        {
            await _context.Offers.AddAsync(m);
            await _context.SaveChangesAsync();
            return m;
        }
        public async Task<Offer?> DeleteAsync(int id)
        {
            var m = await _context.Offers.FirstOrDefaultAsync(x => x.Id == id);
            if (m == null) return null;
            _context.Offers.Remove(m);
            await _context.SaveChangesAsync();
            return m;
        }
        public async Task<List<Offer>> GetAllAsync()
        {
            return await _context.Offers.Include(a => a.AppUser).ToListAsync();
        }
        public async Task<Offer?> GetByIdAsync(int id)
        {
            return await _context.Offers.Include(a => a.AppUser).FirstOrDefaultAsync(x => x.Id == id);
        }
        public async Task<Offer?> UpdateAsync(int id, Offer m)
        {
            var existing = await _context.Offers.FindAsync(id);
            if (existing == null) return null;
            existing.Title = m.Title;
            existing.Content = m.Content;
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
