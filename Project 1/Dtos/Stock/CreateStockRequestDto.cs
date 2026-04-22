using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Dtos.Stock
{
    public class CreateStockRequestDto
    {
        [Required]
        [MaxLength (10,ErrorMessage ="Symbol cannot be over 10 characters")]
        public String Symbol { get; set; } = String.Empty;
        [Required]
        [MaxLength(10, ErrorMessage = "CompanyName cannot be over 10 characters")]
        public string CompanyName { get; set; } = String.Empty;
        [Required]
        [Range(0.01, 1000000000, ErrorMessage = "Price must be in rupees")]
        public decimal Price { get; set; }
        [Required]
        [Range(1, 10000000, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }
        [Required]
        [Range(1, 1000000000)]
        public long MarketCap { get; set; }
    }
}
