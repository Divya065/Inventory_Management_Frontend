using Project_1.Dtos.Product;
using Project_1.Helpers;
using Project_1.Models;

namespace Project_1.Interface
{
    public interface IProductRepository
    {
        Task<List<Product>> GetAllAsync(QuerryObject querry, string ownerUserId);

        Task<Product?> GetByIdAsync(int id, string ownerUserId);
        Task<Product?> GetBySymbolAsync(string symbol, string ownerUserId);
        Task<Product?> GetByBarcodeAsync(string barcode, string ownerUserId);
        Task<bool> BarcodeExistsAsync(string barcode, string ownerUserId, int? excludeProductId = null);

        Task<Product> CreateAsync(Product productModel);
        Task<Product?> UpdateAsync(int id, UpdateProductDto productDto, string ownerUserId);
        Task<Product?> DeleteAsync(int id, string ownerUserId);
        Task<bool> ProductExists(int id, string ownerUserId);
        Task<bool> ReduceQuantityAsync(int productId, int amount, string ownerUserId);
        Task<bool> IncreaseQuantityAsync(int productId, int amount, string ownerUserId);
    }
}
