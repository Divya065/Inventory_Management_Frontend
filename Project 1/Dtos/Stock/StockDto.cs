using Project_1.Dtos.Offer;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Dtos.Stock
{
    public class StockDto
    {
        public int Id { get; set; }
        public String Symbol { get; set; } = String.Empty;
        public string CompanyName { get; set; } = String.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public long MarketCap { get; set; }
        public List<OfferDto> Offers { get; set; }
    }
}
