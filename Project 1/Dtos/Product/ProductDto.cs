using Project_1.Dtos.Offer;

namespace Project_1.Dtos.Product
{
    public class ProductDto
    {
        public int Id { get; set; }
        public String Symbol { get; set; } = String.Empty;
        public string? Brand { get; set; }
        public string CompanyName { get; set; } = String.Empty;
        public string? Barcode { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public long MarketCap { get; set; }
        public DateTime? ExpiryDate { get; set; }
        /// <summary>New / Old / Expired from ExpiryDate (computed).</summary>
        public string? ExpiryStatus { get; set; }
        public List<OfferDto> Offers { get; set; }
    }
}
