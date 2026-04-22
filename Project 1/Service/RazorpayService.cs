using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Project_1.Configuration;
using Razorpay.Api;

namespace Project_1.Service
{
    // Small helper class for Razorpay.
    // - Creates Razorpay Orders (amount is in paise)
    // - Verifies the signature Razorpay sends back to frontend after payment
    // - (Optional) Verifies webhook signatures if you add webhooks later
    public class RazorpayService
    {
        private readonly RazorpaySettings _settings;

        public RazorpayService(IOptions<RazorpaySettings> options)
        {
            _settings = options.Value;
        }

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_settings.KeyId) && !string.IsNullOrWhiteSpace(_settings.KeySecret);

        public string KeyId => _settings.KeyId;

        public string CreateOrder(decimal amountRupees, string currency, string receipt, Dictionary<string, string>? notes = null)
        {
            // This talks to Razorpay servers. If KeyId/KeySecret are wrong, Razorpay will reject the request.
            if (!IsConfigured)
                throw new InvalidOperationException("Razorpay is not configured. Set Razorpay:KeyId and Razorpay:KeySecret.");

            var client = new RazorpayClient(_settings.KeyId, _settings.KeySecret);

            // Razorpay expects amount in paise, but our app stores totals in rupees.
            var amountPaise = (long)Math.Round(amountRupees * 100m, 0, MidpointRounding.AwayFromZero);
            if (amountPaise < 100)
                throw new InvalidOperationException("Razorpay minimum amount is ₹1 (100 paise).");

            // Razorpay has a strict max length for receipt (40 chars). Keep it short to avoid API errors.
            var rcpt = (receipt ?? string.Empty).Trim();
            if (rcpt.Length > 40)
                rcpt = rcpt[..40];

            // Create the data payload Razorpay expects.
            var data = new Dictionary<string, object>
            {
                { "amount", amountPaise },
                { "currency", string.IsNullOrWhiteSpace(currency) ? "INR" : currency },
                { "receipt", rcpt }
            };
            if (notes != null && notes.Count > 0)
                data["notes"] = notes;

            // Razorpay will return an order id like "order_XXXX".
            var order = client.Order.Create(data);
            return order["id"]?.ToString() ?? throw new InvalidOperationException("Razorpay did not return order id.");
        }

        public bool VerifyCheckoutSignature(string razorpayOrderId, string razorpayPaymentId, string razorpaySignature)
        {
            // This protects you from someone faking a "payment success" in the browser.
            // We recompute the expected signature using your KeySecret and compare it.
            if (string.IsNullOrWhiteSpace(_settings.KeySecret))
                return false;

            var payload = $"{razorpayOrderId}|{razorpayPaymentId}";
            var secret = _settings.KeySecret;
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expected = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            var got = (razorpaySignature ?? string.Empty).Trim().ToLowerInvariant();
            return SlowEquals(expected, got);
        }

        public bool VerifyWebhookSignature(string body, string headerSignature)
        {
            // Webhooks are server-to-server events from Razorpay.
            // Only used if you create a /webhook endpoint and set WebhookSecret in Razorpay dashboard.
            if (string.IsNullOrWhiteSpace(_settings.WebhookSecret))
                return false;

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.WebhookSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body ?? string.Empty));
            var expected = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            var got = (headerSignature ?? string.Empty).Trim().ToLowerInvariant();
            return SlowEquals(expected, got);
        }

        private static bool SlowEquals(string a, string b)
        {
            if (a.Length != b.Length) return false;
            var diff = 0;
            for (var i = 0; i < a.Length; i++)
                diff |= a[i] ^ b[i];
            return diff == 0;
        }
    }
}

