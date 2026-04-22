namespace Project_1.Configuration
{
    public class UpiSettings
    {
        /// <summary>Merchant UPI ID (VPA), e.g. storename@paytm</summary>
        public string MerchantVpa { get; set; } = string.Empty;

        /// <summary>Payee display name shown in UPI apps.</summary>
        public string MerchantName { get; set; } = "Merchant";
    }
}
