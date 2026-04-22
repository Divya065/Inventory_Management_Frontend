namespace Project_1.Configuration
{
    public class RazorpaySettings
    {
        /// <summary>Public key used by Razorpay Checkout on the frontend.</summary>
        public string KeyId { get; set; } = string.Empty;

        /// <summary>Secret key used by backend to create orders and verify signatures.</summary>
        public string KeySecret { get; set; } = string.Empty;

        /// <summary>Webhook secret configured in Razorpay Dashboard for payment events.</summary>
        public string WebhookSecret { get; set; } = string.Empty;
    }
}

