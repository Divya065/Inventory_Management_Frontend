using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Product
{
    public class UpdateProductDto
    {
        [Required]
        [MaxLength(64, ErrorMessage = "Internal code cannot be over 64 characters")]
        public String Symbol { get; set; } = String.Empty;

        [Required]
        [MaxLength(120, ErrorMessage = "Company name cannot be over 120 characters")]
        public string Brand { get; set; } = String.Empty;

        [Required]
        [MaxLength(120, ErrorMessage = "Product name cannot be over 120 characters")]
        public string CompanyName { get; set; } = String.Empty;

        [MaxLength(64, ErrorMessage = "Barcode cannot be over 64 characters")]
        public string? Barcode { get; set; }

        [Required]
        [Range(0, 1000000000, ErrorMessage = "Price cannot be negative.")]
        public decimal Price { get; set; }

        [Required]
        [Range(1, 10000000, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }

        [Required]
        [Range(0, 1000000000, ErrorMessage = "Original price (MRP) cannot be negative.")]
        public long MarketCap { get; set; }

        public DateTime? ExpiryDate { get; set; }
    }
}
