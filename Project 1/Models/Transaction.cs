using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("Transactions")]
    public class Transaction
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        [Column(TypeName = "decimal(18,2)")]
        public decimal Total { get; set; }
        public string Type { get; set; } = "Buy"; // "Buy" or "Loan"
        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public string? ItemsSummary { get; set; }
        /// <summary>JSON snapshot of cart lines for Revert (productId/stockId + quantity).</summary>
        public string? ItemsJson { get; set; }
        /// <summary>For Buy: Cash, Card, or UPI. Null for Loan / older rows.</summary>
        public string? PaymentMethod { get; set; }
        public string? AppUserId { get; set; }
        public AppUser? AppUser { get; set; }
    }
}
