using Project_1.Dtos.Stock;
using Project_1.Models;

namespace Project_1.Mappers
{
    public static class StockMappers
    {
        public static StockDto ToStockDto(this Stock stockModel) 
        {
            return new StockDto
            {
                Id = stockModel.Id,
                Symbol = stockModel.Symbol,
                CompanyName = stockModel.CompanyName,
                Price = stockModel.Price,
                Quantity = stockModel.Quantity,
                MarketCap = stockModel.MarketCap,
                Offers = (stockModel.Offers ?? new List<Offer>()).Select(c => c.ToOfferDto()).ToList(),
            };
        }
        public static Stock ToCreateFromStockDto(this CreateStockRequestDto stockDto)
        {
            return new Stock
            {
                Symbol = stockDto.Symbol,
                CompanyName = stockDto.CompanyName,
                Price = stockDto.Price,
                Quantity = stockDto.Quantity,
                MarketCap = stockDto.MarketCap
            };
        }
    }
}
