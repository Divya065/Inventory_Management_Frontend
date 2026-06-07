using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Stock
{
    public class UpdateStockDto
    {
        [Required]
        [MaxLength(10, ErrorMessage = "Symbol cannot be over 10 characters")]
        public String Symbol { get; set; } = String.Empty;
        [Required]
        [MaxLength(120, ErrorMessage = "CompanyName cannot be over 120 characters")]
        public string CompanyName { get; set; } = String.Empty;
        [Required]
        [Range(0, 1000000000, ErrorMessage = "Price cannot be negative.")]
        public decimal Price { get; set; }
        [Required]
        [Range(1, 10000000, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }
        [Required]
        [Range(0, 1000000000, ErrorMessage = "Original price (MRP) cannot be negative.")]
        public long MarketCap { get; set; }
    }
}
