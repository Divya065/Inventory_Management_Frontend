using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Transaction
{
    public class CreateTransactionDto
    {
        [Required(ErrorMessage = "Customer name is required")]
        [MinLength(1)]
        [MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Total must be greater than 0")]
        public decimal Total { get; set; }

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Buy"; // "Buy" or "Loan"

        /// <summary>For Buy only: Cash or UPI. Optional; defaults to Cash when omitted.</summary>
        [MaxLength(20)]
        public string? PaymentMethod { get; set; }
    }
}
