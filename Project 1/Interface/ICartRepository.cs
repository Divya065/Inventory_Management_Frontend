using Project_1.Dtos.Cart;
using Project_1.Models;

namespace Project_1.Interface
{
    public interface ICartRepository
    {
        Task<List<CartItemDto>> GetUserCart(AppUser user);
        Task<CartItem?> GetByUserAndProductAsync(string userId, int productId);
        Task<CartItem> CreateAsync(CartItem cartItem);
        Task UpdateAsync(CartItem cartItem);
        Task<CartItem?> DeleteCartItem(AppUser appUser, string symbol);
        Task ClearUserCartAsync(string userId);
    }
}
