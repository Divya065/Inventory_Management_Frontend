using Project_1.Dtos.Cart;
using Project_1.Models;

namespace Project_1.Interface
{
    public interface ICartParkingRepository
    {
        Task<CartState?> GetCartStateAsync(string userId);
        Task SetActiveCustomerNameAsync(string userId, string? customerName);
        Task ClearActiveCustomerNameAsync(string userId);

        Task<List<ParkedCart>> GetParkedCartsAsync(string userId);
        Task<ParkedCart?> GetParkedCartAsync(int id, string userId);
        Task<ParkedCart> CreateParkedCartAsync(ParkedCart parked);
        Task DeleteParkedCartAsync(ParkedCart parked);
        Task<bool> ParkedNameExistsAsync(string userId, string customerName, int? excludeId = null);
    }
}
