using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Project_1.Configuration;
using Project_1.Dtos.Payment;
using Project_1.Dtos.Transaction;
using Project_1.Extentions;
using Project_1.Helpers;
using Project_1.Interface;
using Project_1.Models;
using Project_1.Service;

namespace Project_1.Controllers
{
    // This controller holds payment-related API endpoints.
    // It does NOT store bank details. It only talks to payment providers (Razorpay) and our own DB.
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        // App configuration settings (appsettings.json)
        private readonly UpiSettings _upi;
        private readonly RazorpaySettings _razorpay;

        // Small helper service that calls Razorpay API + verifies signatures.
        private readonly RazorpayService _razorpayService;

        // Used to find which user is logged in (from JWT token)
        private readonly UserManager<AppUser> _userManager;

        // Used to read the cart items and update inventory/cart
        private readonly IPortfolioRepository _portfolioRepo;
        private readonly IStockRepository _stockRepo;

        // Used to save the final Buy transaction (what you show in Transactions page)
        private readonly ITransactionRepository _transactionRepo;

        // Used to save a temporary payment-order record before payment succeeds
        private readonly IPaymentOrderRepository _paymentOrderRepo;

        public PaymentController(
            IOptions<UpiSettings> upiOptions,
            IOptions<RazorpaySettings> razorpayOptions,
            RazorpayService razorpayService,
            UserManager<AppUser> userManager,
            IPortfolioRepository portfolioRepo,
            IStockRepository stockRepo,
            ITransactionRepository transactionRepo,
            IPaymentOrderRepository paymentOrderRepo)
        {
            _upi = upiOptions.Value;
            _razorpay = razorpayOptions.Value;
            _razorpayService = razorpayService;
            _userManager = userManager;
            _portfolioRepo = portfolioRepo;
            _stockRepo = stockRepo;
            _transactionRepo = transactionRepo;
            _paymentOrderRepo = paymentOrderRepo;
        }

        /// <summary>Merchant UPI details for building a pay QR (configure in appsettings.json → Upi).</summary>
        [HttpGet("upi-settings")]
        public IActionResult GetUpiSettings()
        {
            // This is only configuration to show on frontend (your UPI ID + display name).
            var vpa = _upi.MerchantVpa?.Trim() ?? string.Empty;
            var name = string.IsNullOrWhiteSpace(_upi.MerchantName) ? "Merchant" : _upi.MerchantName.Trim();
            return Ok(new
            {
                merchantVpa = vpa,
                merchantName = name,
                configured = !string.IsNullOrEmpty(vpa)
            });
        }

        [HttpGet("razorpay/config")]
        public IActionResult GetRazorpayConfig()
        {
            // Frontend uses this to know if it can open Razorpay Checkout.
            // KeyId is safe to send to frontend; KeySecret must stay only on backend.
            var keyId = _razorpay.KeyId?.Trim() ?? string.Empty;
            return Ok(new
            {
                configured = !string.IsNullOrEmpty(keyId) && !string.IsNullOrEmpty(_razorpay.KeySecret?.Trim() ?? string.Empty),
                keyId
            });
        }

        [HttpPost("razorpay/order")]
        public async Task<IActionResult> CreateRazorpayOrder([FromBody] CreateRazorpayOrderRequestDto? dto)
        {
            // Step 1 of Razorpay flow:
            // - read cart from DB
            // - calculate total on server (so user cannot change the amount in browser)
            // - create a Razorpay "Order" and save it in our DB (PaymentOrders)
            if (dto == null)
                return BadRequest(new { message = "Request body is required (CustomerName)." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if (!CustomerNameValidation.TryValidate(dto.CustomerName, out var customerName, out var nameError))
                return BadRequest(new { message = nameError });
            if (!_razorpayService.IsConfigured)
                return BadRequest(new { message = "Razorpay is not configured. Set Razorpay:KeyId and Razorpay:KeySecret in appsettings or environment." });

            // Identify the logged-in user (JWT → username)
            var username = User.GetUsername();
            if (string.IsNullOrWhiteSpace(username))
                return Unauthorized(new { message = "Could not determine current user." });

            var appUser = await _userManager.FindByNameAsync(username);
            if (appUser == null)
                return Unauthorized(new { message = "User not found." });

            // Read cart items for this user
            var cartItems = await _portfolioRepo.GetUserPortfolio(appUser);
            if (cartItems == null || cartItems.Count == 0)
                return BadRequest(new { message = "Cart is empty. Add items before paying." });

            // Server-side total from cart snapshot (important: we trust DB, not browser)
            var total = cartItems.Sum(i => (i.Price) * (i.Quantity <= 0 ? 1 : i.Quantity));
            if (total <= 0)
                return BadRequest(new { message = "Cart total must be greater than 0." });

            // Build a readable summary for receipt/transactions UI
            var itemsSummary = string.Join(", ", cartItems.Select(i =>
            {
                var name = string.IsNullOrWhiteSpace(i.CompanyName) ? i.Symbol : i.CompanyName;
                var qty = i.Quantity <= 0 ? 1 : i.Quantity;
                return $"{name} x{qty}";
            }));

            // Save a small “cart snapshot” so later we can reduce the correct stock quantities
            var orderItems = cartItems.Select(i => new
            {
                stockId = i.Id,
                quantity = i.Quantity <= 0 ? 1 : i.Quantity
            }).ToList();

            // Razorpay: receipt max 40 characters (longer values cause API errors).
            var receipt = Guid.NewGuid().ToString("N");
            var notes = new Dictionary<string, string>
            {
                { "customer_name", customerName }
            };

            string providerOrderId;
            try
            {
                // Create Razorpay order using your KeyId/KeySecret
                providerOrderId = _razorpayService.CreateOrder(total, "INR", receipt, notes);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Razorpay CreateOrder: {ex.Message}");
                return StatusCode(502, new
                {
                    message = "Razorpay could not create an order. Check Key Id / Key Secret (test vs live) and your network.",
                    detail = ex.Message
                });
            }

            // Save the provider's order id in our DB so we can verify later
            var po = new PaymentOrder
            {
                Provider = "Razorpay",
                ProviderOrderId = providerOrderId,
                Amount = total,
                Currency = "INR",
                Status = "Created",
                CustomerName = customerName,
                ItemsSummary = itemsSummary,
                OrderItemsJson = JsonConvert.SerializeObject(orderItems),
                AppUserId = appUser.Id
            };
            try
            {
                await _paymentOrderRepo.CreateAsync(po);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PaymentOrder save: {ex.Message}");
                return StatusCode(500, new
                {
                    message = "Payment order could not be saved. Ensure the database has the PaymentOrders table (restart API once so startup SQL runs), then try again.",
                    detail = ex.Message
                });
            }

            // Return minimal info that frontend needs to open Razorpay Checkout
            return Ok(new CreateRazorpayOrderResponseDto
            {
                KeyId = _razorpayService.KeyId,
                OrderId = providerOrderId,
                AmountPaise = (long)Math.Round(total * 100m, 0, MidpointRounding.AwayFromZero),
                Currency = "INR",
                CustomerName = po.CustomerName,
                ItemsSummary = po.ItemsSummary
            });
        }

        [HttpPost("razorpay/verify")]
        public async Task<IActionResult> VerifyRazorpayPayment([FromBody] VerifyRazorpayPaymentRequestDto? dto)
        {
            // Step 2 of Razorpay flow (after user paid in Razorpay popup):
            // - frontend sends orderId/paymentId/signature
            // - backend verifies signature with KeySecret
            // - if valid: reduce stock, clear cart, create Buy transaction, mark PaymentOrder as Paid
            if (dto == null)
                return BadRequest(new { message = "Request body is required (RazorpayOrderId, RazorpayPaymentId, RazorpaySignature)." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if (!_razorpayService.IsConfigured)
                return BadRequest(new { message = "Razorpay is not configured." });

            // Identify the logged-in user again
            var username = User.GetUsername();
            if (string.IsNullOrWhiteSpace(username))
                return Unauthorized(new { message = "Could not determine current user." });

            var appUser = await _userManager.FindByNameAsync(username);
            if (appUser == null)
                return Unauthorized(new { message = "User not found." });

            // This is the core security step: confirms the success response is real (not faked from browser).
            var ok = _razorpayService.VerifyCheckoutSignature(dto.RazorpayOrderId, dto.RazorpayPaymentId, dto.RazorpaySignature);
            if (!ok)
                return BadRequest(new { message = "Payment signature verification failed." });

            // Load our stored PaymentOrder record
            var order = await _paymentOrderRepo.GetByProviderOrderIdAsync(dto.RazorpayOrderId, appUser.Id);
            if (order == null)
                return NotFound(new { message = "Payment order not found." });
            if (string.Equals(order.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                // Idempotent: return the latest matching Buy transaction
                var list = await _transactionRepo.GetAllAsync(appUser.Id);
                var last = list.FirstOrDefault(t => string.Equals(t.Type, "Buy", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(t.CustomerName, order.CustomerName, StringComparison.OrdinalIgnoreCase)
                    && t.Total == order.Amount);
                if (last == null)
                    return Ok(new { message = "Payment already verified." });

                return Ok(new TransactionDto
                {
                    Id = last.Id,
                    CustomerName = last.CustomerName,
                    Total = last.Total,
                    Type = last.Type,
                    CreatedOn = last.CreatedOn,
                    ItemsSummary = last.ItemsSummary,
                    PaymentMethod = last.PaymentMethod
                });
            }

            // Use stored cart snapshot (order items) to reduce stock and clear cart.
            var items = JsonConvert.DeserializeObject<List<OrderItemLite>>(order.OrderItemsJson ?? "[]") ?? new List<OrderItemLite>();
            if (items.Count == 0)
                return BadRequest(new { message = "Order items missing. Please create a new payment." });

            // Validate stock availability first (so we don't partially reduce inventory)
            foreach (var it in items)
            {
                var stock = await _stockRepo.GetByIdAsync(it.StockId);
                if (stock == null || stock.Quantity < it.Quantity)
                    return BadRequest(new { message = "Out of stock. One or more items are no longer available. Please create a new payment." });
            }
            foreach (var it in items)
            {
                // Reduce inventory for each purchased item
                await _stockRepo.ReduceQuantityAsync(it.StockId, it.Quantity);
            }
            // Clear cart after successful payment
            await _portfolioRepo.ClearUserPortfolioAsync(appUser.Id);

            // Create the final "Buy" transaction that appears in Transactions page
            var transaction = new Transaction
            {
                CustomerName = order.CustomerName,
                Total = order.Amount,
                Type = "Buy",
                AppUserId = appUser.Id,
                ItemsSummary = order.ItemsSummary,
                PaymentMethod = "Razorpay"
            };
            await _transactionRepo.CreateAsync(transaction);

            // Update PaymentOrder status so we don't create duplicates
            order.Status = "Paid";
            order.ProviderPaymentId = dto.RazorpayPaymentId;
            order.PaidOn = DateTime.UtcNow;
            await _paymentOrderRepo.UpdateAsync(order);

            // Return transaction data so frontend can show receipt immediately
            return Ok(new TransactionDto
            {
                Id = transaction.Id,
                CustomerName = transaction.CustomerName,
                Total = transaction.Total,
                Type = transaction.Type,
                CreatedOn = transaction.CreatedOn,
                ItemsSummary = transaction.ItemsSummary,
                PaymentMethod = transaction.PaymentMethod
            });
        }

        private class OrderItemLite
        {
            [JsonProperty("stockId")]
            public int StockId { get; set; }

            [JsonProperty("quantity")]
            public int Quantity { get; set; }
        }
    }
}
