namespace Project_1.Dtos.Payment
{
    public class CreateRazorpayOrderResponseDto
    {
        public string KeyId { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public long AmountPaise { get; set; }
        public string Currency { get; set; } = "INR";
        public string CustomerName { get; set; } = string.Empty;
        public string? ItemsSummary { get; set; }
    }
}

