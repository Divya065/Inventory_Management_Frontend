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
        [Range(1,1000000000)]
        public decimal Purchase { get; set; }
        [Required]
        [Range(0.001,100)]
        public decimal LastDiv { get; set; }
        [Required]
        [MaxLength(10, ErrorMessage = "Industry cannot be over 10 characters")]
        public String Industry { get; set; } = String.Empty;
        [Required]
        [Range(1, 1000000000)]
        public long MarketCap { get; set; }
    }
}
