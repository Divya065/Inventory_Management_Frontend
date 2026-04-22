using Project_1.Models;

namespace Project_1.Interface
{
    public interface IPaymentOrderRepository
    {
        Task<PaymentOrder> CreateAsync(PaymentOrder order);
        Task<PaymentOrder?> GetByProviderOrderIdAsync(string providerOrderId, string userId);
        Task<PaymentOrder?> GetByProviderOrderIdAnyUserAsync(string providerOrderId);
        Task UpdateAsync(PaymentOrder order);
    }
}

