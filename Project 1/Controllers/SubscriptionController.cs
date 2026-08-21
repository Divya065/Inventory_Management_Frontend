using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Project_1.Configuration;
using Project_1.Dtos.Payment;
using Project_1.Dtos.Subscription;
using Project_1.Extentions;
using Project_1.Helpers;
using Project_1.Interface;
using Project_1.Models;
using Project_1.Service;

namespace Project_1.Controllers
{
    [Route("api/subscription")]
    [ApiController]
    public class SubscriptionController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly RazorpayService _razorpayService;
        private readonly IPaymentOrderRepository _paymentOrderRepo;
        private readonly SubscriptionSettings _pricing;

        public SubscriptionController(
            UserManager<AppUser> userManager,
            RazorpayService razorpayService,
            IPaymentOrderRepository paymentOrderRepo,
            IOptions<SubscriptionSettings> pricing)
        {
            _userManager = userManager;
            _razorpayService = razorpayService;
            _paymentOrderRepo = paymentOrderRepo;
            _pricing = pricing.Value;
        }

        [HttpGet("pricing")]
        [AllowAnonymous]
        public IActionResult Pricing()
        {
            return Ok(new
            {
                trialDays = 14,
                monthlyPriceInr = _pricing.MonthlyPriceInr,
                yearlyPriceInr = _pricing.YearlyPriceInr,
                currency = "INR",
                razorpayConfigured = _razorpayService.IsConfigured
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var user = await GetShopUserAsync();
            if (user == null)
                return Unauthorized(new { message = "User not found." });
            if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
                return StatusCode(403, new { message = "Super Admin does not use a shop subscription." });

            return Ok(SubscriptionHelper.ToDto(user));
        }

        [HttpPost("start-trial")]
        [Authorize]
        public async Task<IActionResult> StartTrial()
        {
            var user = await GetShopUserAsync();
            if (user == null)
                return Unauthorized(new { message = "User not found." });
            if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
                return StatusCode(403, new { message = "Super Admin does not use a shop subscription." });
            if (!user.IsActive)
                return StatusCode(403, new { message = "This shop account is suspended." });
            if (user.HasUsedTrial)
                return BadRequest(new { message = "Trial has already been used. Choose Monthly or Yearly." });
            if (SubscriptionHelper.HasAccess(user))
                return BadRequest(new { message = "You already have an active plan." });

            SubscriptionHelper.StartTrial(user);
            await _userManager.UpdateAsync(user);
            return Ok(SubscriptionHelper.ToDto(user));
        }

        [HttpPost("razorpay/order")]
        [Authorize]
        public async Task<IActionResult> CreateSubscriptionOrder([FromBody] ChoosePlanDto? dto)
        {
            var user = await GetShopUserAsync();
            if (user == null)
                return Unauthorized(new { message = "User not found." });
            if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
                return StatusCode(403, new { message = "Super Admin does not use a shop subscription." });
            if (!user.IsActive)
                return StatusCode(403, new { message = "This shop account is suspended." });

            if (SubscriptionHelper.HasAccess(user))
                return BadRequest(new { message = "A plan is already active. You cannot take another plan until it expires." });

            var plan = (dto?.Plan ?? "").Trim();
            if (plan is not (SubscriptionHelper.Monthly or SubscriptionHelper.Yearly))
                return BadRequest(new { message = "Only Monthly or Yearly plans can be purchased." });

            if (!_razorpayService.IsConfigured)
                return BadRequest(new { message = "Razorpay is not configured. Set Razorpay keys in appsettings and restart the API." });

            var amount = plan == SubscriptionHelper.Monthly ? _pricing.MonthlyPriceInr : _pricing.YearlyPriceInr;
            if (amount < 1m)
                return BadRequest(new { message = "Subscription price is not configured." });

            var receipt = $"sub-{plan[..Math.Min(3, plan.Length)]}-{Guid.NewGuid():N}"[..40];
            string providerOrderId;
            try
            {
                providerOrderId = _razorpayService.CreateOrder(amount, "INR", receipt, new Dictionary<string, string>
                {
                    ["type"] = "subscription",
                    ["plan"] = plan
                });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Could not create Razorpay order.", error = ex.Message });
            }

            var po = new PaymentOrder
            {
                Provider = "Razorpay",
                ProviderOrderId = providerOrderId,
                Amount = amount,
                Currency = "INR",
                Status = "Created",
                CustomerName = user.UserName ?? "Shop",
                ItemsSummary = $"Subscription:{plan}",
                OrderItemsJson = $"{{\"plan\":\"{plan}\"}}",
                AppUserId = user.Id,
                CreatedOn = DateTime.UtcNow
            };
            await _paymentOrderRepo.CreateAsync(po);

            return Ok(new CreateRazorpayOrderResponseDto
            {
                KeyId = _razorpayService.KeyId,
                OrderId = providerOrderId,
                AmountPaise = (long)Math.Round(amount * 100m, 0, MidpointRounding.AwayFromZero),
                Currency = "INR",
                CustomerName = po.CustomerName,
                ItemsSummary = po.ItemsSummary
            });
        }

        [HttpPost("razorpay/verify")]
        [Authorize]
        public async Task<IActionResult> VerifySubscriptionPayment([FromBody] VerifyRazorpayPaymentRequestDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Razorpay payment details are required." });
            if (!_razorpayService.IsConfigured)
                return BadRequest(new { message = "Razorpay is not configured." });

            var user = await GetShopUserAsync();
            if (user == null)
                return Unauthorized(new { message = "User not found." });
            if (!user.IsActive)
                return StatusCode(403, new { message = "This shop account is suspended." });

            if (!_razorpayService.VerifyCheckoutSignature(dto.RazorpayOrderId, dto.RazorpayPaymentId, dto.RazorpaySignature))
                return BadRequest(new { message = "Payment signature verification failed." });

            var order = await _paymentOrderRepo.GetByProviderOrderIdAsync(dto.RazorpayOrderId, user.Id);
            if (order == null)
                return NotFound(new { message = "Payment order not found." });

            if (!string.Equals(order.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                var plan = ParsePlan(order);
                if (plan == null)
                    return BadRequest(new { message = "This payment is not a subscription order." });

                var error = SubscriptionHelper.ApplyPlan(user, plan, allowTrialReuse: false);
                if (error != null)
                    return BadRequest(new { message = error });

                order.Status = "Paid";
                order.ProviderPaymentId = dto.RazorpayPaymentId;
                order.PaidOn = DateTime.UtcNow;
                await _paymentOrderRepo.UpdateAsync(order);
                await _userManager.UpdateAsync(user);
            }

            return Ok(SubscriptionHelper.ToDto(user));
        }

        private static string? ParsePlan(PaymentOrder order)
        {
            var summary = order.ItemsSummary ?? "";
            if (summary.StartsWith("Subscription:", StringComparison.OrdinalIgnoreCase))
            {
                var plan = summary["Subscription:".Length..].Trim();
                if (plan is SubscriptionHelper.Monthly or SubscriptionHelper.Yearly)
                    return plan;
            }
            return null;
        }

        private async Task<AppUser?> GetShopUserAsync()
        {
            var username = User.GetUsername();
            if (string.IsNullOrWhiteSpace(username))
                return null;
            return await _userManager.FindByNameAsync(username);
        }
    }
}
