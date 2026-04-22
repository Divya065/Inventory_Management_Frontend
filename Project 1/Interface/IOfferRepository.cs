using Project_1.Models;

namespace Project_1.Interface
{
    public interface IOfferRepository
    {
        Task<List<Offer>> GetAllAsync();
        Task<Offer?> GetByIdAsync(int id);
        Task<Offer> CreateAsync(Offer offerModel);
        Task<Offer?> UpdateAsync(int id, Offer offerModel);
        Task<Offer?> DeleteAsync(int id);
    }
}
