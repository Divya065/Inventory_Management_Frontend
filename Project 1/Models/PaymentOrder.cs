using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("PaymentOrders")]
    public class PaymentOrder
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Provider { get; set; } = "Razorpay";
        public string ProviderOrderId { get; set; } = string.Empty;
        public string? ProviderPaymentId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";

        /// <summary>Created, Paid, Failed, Cancelled</summary>
        public string Status { get; set; } = "Created";

        public string CustomerName { get; set; } = string.Empty;
        public string? ItemsSummary { get; set; }
        public string? OrderItemsJson { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime? PaidOn { get; set; }

        public string? AppUserId { get; set; }
        public AppUser? AppUser { get; set; }
    }
}

