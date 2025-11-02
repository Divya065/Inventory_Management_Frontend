using Project_1.Dtos.Stock;
using Project_1.Helpers;
using Project_1.Models;

namespace Project_1.Interface
{
    public interface IStockRepository
    {
        Task<List<Stock>> GetAllAsync(QuerryObject querry);

        Task<Stock?> GetByIdAsync(int id);
        Task<Stock?> GetBySymbolAsync(string symbol);
        
        Task<Stock> CreateAsync(Stock stockModel);
        Task<Stock?> UpdateAsync(int id,UpdateStockDto stockDto);
        Task<Stock?> DeleteAsync(int id);
        Task<bool> stockExist(int id);
    }
}
