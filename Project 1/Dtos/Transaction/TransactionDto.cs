namespace Project_1.Dtos.Transaction
{
    public class TransactionDto
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public string Type { get; set; } = "Buy";
        public DateTime CreatedOn { get; set; }
        public string? ItemsSummary { get; set; }
        /// <summary>JSON snapshot of sold lines (qty, offer, expiry) for receipt / revert.</summary>
        public string? ItemsJson { get; set; }
        public string? PaymentMethod { get; set; }
        /// <summary>True when Revert can restore inventory (or undo a loan payment).</summary>
        public bool CanRevert { get; set; }
    }
}
