using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Repository
{
    public class PaymentOrderRepository : IPaymentOrderRepository
    {
        private readonly ApplicationDBContext _context;

        public PaymentOrderRepository(ApplicationDBContext context)
        {
            _context = context;
        }

        public async Task<PaymentOrder> CreateAsync(PaymentOrder order)
        {
            await _context.PaymentOrders.AddAsync(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<PaymentOrder?> GetByProviderOrderIdAsync(string providerOrderId, string userId)
        {
            return await _context.PaymentOrders
                .FirstOrDefaultAsync(o => o.ProviderOrderId == providerOrderId && o.AppUserId == userId);
        }

        public async Task<PaymentOrder?> GetByProviderOrderIdAnyUserAsync(string providerOrderId)
        {
            return await _context.PaymentOrders
                .FirstOrDefaultAsync(o => o.ProviderOrderId == providerOrderId);
        }

        public async Task UpdateAsync(PaymentOrder order)
        {
            _context.PaymentOrders.Update(order);
            await _context.SaveChangesAsync();
        }
    }
}

