using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Project_1.Dtos.Cart;
using Project_1.Dtos.Transaction;
using Project_1.Helpers;
using Project_1.Filters;
using Project_1.Extentions;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    [RequireShopSubscription]
    public class TransactionController : ControllerBase
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly ITransactionRepository _transactionRepo;
        private readonly UserManager<AppUser> _userManager;
        private readonly ICartRepository _cartRepo;
        private readonly IProductRepository _productRepo;
        private readonly ICartParkingRepository _cartParkingRepo;

        public TransactionController(
            ITransactionRepository transactionRepo,
            UserManager<AppUser> userManager,
            ICartRepository cartRepo,
            IProductRepository productRepo,
            ICartParkingRepository cartParkingRepo)
        {
            _transactionRepo = transactionRepo;
            _userManager = userManager;
            _cartRepo = cartRepo;
            _productRepo = productRepo;
            _cartParkingRepo = cartParkingRepo;
        }

        private static TransactionDto ToDto(Transaction t) => new()
        {
            Id = t.Id,
            CustomerName = t.CustomerName,
            Total = t.Total,
            Type = t.Type,
            CreatedOn = t.CreatedOn,
            ItemsSummary = t.ItemsSummary,
            ItemsJson = t.ItemsJson,
            PaymentMethod = t.PaymentMethod,
            CanRevert = CanRevertTransaction(t)
        };

        private static bool CanRevertTransaction(Transaction t)
        {
            if (string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase))
                return true;
            return !string.IsNullOrWhiteSpace(t.ItemsJson);
        }

        private static SoldItemDto ToSoldItem(CartItemDto i)
        {
            var name = string.IsNullOrWhiteSpace(i.CompanyName) ? i.Symbol : i.CompanyName;
            var qty = i.Quantity > 0 ? i.Quantity : 1;
            return new SoldItemDto
            {
                ProductId = i.Id,
                Quantity = qty,
                Symbol = i.Symbol,
                Name = name,
                OfferTitle = i.OfferTitle,
                ExpiryDate = i.ExpiryDate,
                ExpiryStatus = i.ExpiryStatus ?? ExpiryFreshness.Status(i.ExpiryDate)
            };
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? type = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] int? page = null,
            [FromQuery] int pageSize = 10)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Paged + filtered (Transactions page). `to` is exclusive end.
            if (page.HasValue)
            {
                var (items, total) = await _transactionRepo.GetPagedAsync(
                    userId, type, from, to, page.Value, pageSize);
                return Ok(new
                {
                    items = items.Select(ToDto).ToList(),
                    totalCount = total,
                    page = page.Value < 1 ? 1 : page.Value,
                    pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 100)
                });
            }

            // Legacy: full list (dashboard / other callers)
            var transactions = await _transactionRepo.GetAllAsync(userId);
            IEnumerable<Transaction> filtered = transactions;
            if (!string.IsNullOrWhiteSpace(type))
                filtered = filtered.Where(t => string.Equals(t.Type, type, StringComparison.OrdinalIgnoreCase));
            if (from.HasValue)
                filtered = filtered.Where(t => t.CreatedOn >= from.Value);
            if (to.HasValue)
                filtered = filtered.Where(t => t.CreatedOn < to.Value);
            return Ok(filtered.Select(ToDto).ToList());
        }

        /// <summary>
        /// End-of-day totals: cash / card / online sales, loans given, loan payments, expected drawer cash.
        /// </summary>
        [HttpGet("day-close")]
        public async Task<IActionResult> GetDayClose([FromQuery] DateTime? date = null)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Could not determine current user." });

            // Calendar day for shop close; reject nonsense years (e.g. 0225) and future dates
            var day = (date ?? DateTime.Now).Date;
            var today = DateTime.Now.Date;
            if (day.Year < 2000 || day.Year > 2100 || day > today)
                return BadRequest(new { message = "Invalid date" });

            var from = day;
            var to = day.AddDays(1);

            var rows = await _transactionRepo.GetInRangeAsync(userId, from, to);

            decimal cash = 0, card = 0, online = 0, other = 0;
            int buyCount = 0;
            decimal loansGiven = 0;
            int loanCount = 0;
            decimal loanPayments = 0;
            int loanPaymentCount = 0;

            foreach (var t in rows)
            {
                var type = t.Type ?? "";
                if (string.Equals(type, "Buy", StringComparison.OrdinalIgnoreCase))
                {
                    buyCount++;
                    var pm = (t.PaymentMethod ?? "Cash").Trim().ToLowerInvariant();
                    if (pm.Contains("cash"))
                        cash += t.Total;
                    else if (pm.Contains("card") || pm.Contains("debit") || pm.Contains("credit"))
                        card += t.Total;
                    else if (pm.Contains("razorpay") || pm.Contains("online") || pm.Contains("upi"))
                        online += t.Total;
                    else
                        other += t.Total;
                }
                else if (string.Equals(type, "Loan", StringComparison.OrdinalIgnoreCase))
                {
                    loanCount++;
                    loansGiven += t.Total;
                }
                else if (string.Equals(type, "LoanPayment", StringComparison.OrdinalIgnoreCase))
                {
                    loanPaymentCount++;
                    loanPayments += t.Total;
                }
            }

            var totalSales = cash + card + online + other;
            return Ok(new DayCloseDto
            {
                Date = day.ToString("yyyy-MM-dd"),
                BuyCount = buyCount,
                CashSales = cash,
                CardSales = card,
                OnlineSales = online,
                OtherSales = other,
                TotalSales = totalSales,
                LoanCount = loanCount,
                LoansGiven = loansGiven,
                LoanPaymentCount = loanPaymentCount,
                LoanPayments = loanPayments,
                ExpectedCashInDrawer = cash + loanPayments
            });
        }

        [HttpGet("loans/summary")]
        public async Task<IActionResult> GetLoanSummary()
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Could not determine current user." });

            var transactions = await _transactionRepo.GetAllAsync(userId);
            var loanRelated = transactions.Where(t =>
                string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase)).ToList();

            var grouped = loanRelated
                .GroupBy(t => t.CustomerName?.Trim() ?? "")
                .Where(g => !string.IsNullOrEmpty(g.Key))
                .Select(g => new LoanSummaryDto
                {
                    CustomerName = g.Key,
                    TotalBorrowed = g.Where(t => string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Total),
                    TotalPaid = g.Where(t => string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Total),
                    TotalLoan = g.Where(t => string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Total)
                        - g.Where(t => string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Total),
                    Status =
                        (g.Where(t => string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Total)
                          - g.Where(t => string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Total)) <= 0
                            ? "Paid"
                            : g.Any(t => string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase))
                                ? "Partial"
                                : "Pending",
                    TransactionCount = g.Count(),
                    LastLoanDate = g.Max(t => t.CreatedOn)
                })
                .Where(x => x.TotalLoan != 0 || x.TransactionCount > 0)
                .OrderByDescending(x => x.TotalLoan)
                .ToList();

            return Ok(grouped);
        }

        [HttpGet("customer-loan-history")]
        public async Task<IActionResult> GetLoansByCustomer([FromQuery] string? customerName)
        {
            if (string.IsNullOrWhiteSpace(customerName))
                return BadRequest(new { message = "customerName is required." });

            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Could not determine current user." });

            var transactions = await _transactionRepo.GetAllAsync(userId);
            var name = customerName.Trim();
            var list = transactions
                .Where(t => string.Equals(t.CustomerName?.Trim(), name, StringComparison.OrdinalIgnoreCase)
                    && (string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase)
                        || string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase)))
                .OrderByDescending(t => t.CreatedOn)
                .Select(ToDto)
                .ToList();

            return Ok(list);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var t = await _transactionRepo.GetByIdAsync(id);
            if (t == null)
                return NotFound();

            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            if (appUser == null || t.AppUserId != appUser.Id)
                return NotFound();

            return Ok(ToDto(t));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteOne([FromRoute] int id)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var ok = await _transactionRepo.DeleteOneAsync(id, userId);
            if (!ok)
                return NotFound(new { message = "Transaction not found." });
            return Ok(new { message = "Transaction deleted." });
        }

        /// <summary>
        /// Undo a sale/loan: restore inventory from saved items, then remove the record.
        /// LoanPayment: removes the payment only (outstanding increases again).
        /// </summary>
        [HttpPost("{id:int}/revert")]
        public async Task<IActionResult> Revert([FromRoute] int id)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Could not determine current user." });

            var t = await _transactionRepo.GetByIdAsync(id);
            if (t == null || t.AppUserId != userId)
                return NotFound(new { message = "Transaction not found." });

            var type = t.Type ?? "";

            if (string.Equals(type, "LoanPayment", StringComparison.OrdinalIgnoreCase))
            {
                await _transactionRepo.DeleteOneAsync(id, userId);
                return Ok(new { message = "Loan payment reverted. Outstanding balance increased." });
            }

            if (!string.Equals(type, "Buy", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(type, "Loan", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Only Buy, Loan, or Loan payment entries can be reverted." });
            }

            if (string.IsNullOrWhiteSpace(t.ItemsJson))
            {
                return BadRequest(new
                {
                    message = "This older record has no item snapshot, so stock cannot be restored automatically. Use Delete to remove the record only, then adjust inventory manually if needed."
                });
            }

            List<SoldItemDto>? items;
            try
            {
                items = JsonSerializer.Deserialize<List<SoldItemDto>>(t.ItemsJson, JsonOptions);
            }
            catch
            {
                return BadRequest(new { message = "Saved item data is invalid. Stock cannot be restored automatically." });
            }

            if (items == null || items.Count == 0)
            {
                return BadRequest(new { message = "No items found to restore. Use Delete to remove the record only." });
            }

            foreach (var item in items)
            {
                if (item.StockId > 0 && item.Quantity > 0)
                    await _productRepo.IncreaseQuantityAsync(item.ProductId, item.Quantity, userId);
            }

            await _transactionRepo.DeleteOneAsync(id, userId);
            return Ok(new
            {
                message = string.Equals(type, "Loan", StringComparison.OrdinalIgnoreCase)
                    ? "Loan reverted. Items returned to inventory and loan record removed."
                    : "Sale reverted. Items returned to inventory and transaction removed."
            });
        }

        [HttpDelete("all")]
        public async Task<IActionResult> DeleteAll()
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var deleted = await _transactionRepo.DeleteAllAsync(userId);
            return Ok(new { message = "All transactions deleted.", deleted });
        }

        [HttpDelete("loans/all")]
        public async Task<IActionResult> DeleteAllLoans()
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var deleted = await _transactionRepo.DeleteAllLoansAsync(userId);
            return Ok(new { message = "All loan and payment records deleted.", deleted });
        }

        [HttpDelete("loans/customer")]
        public async Task<IActionResult> DeleteAllLoansForCustomer([FromQuery] string? customerName)
        {
            if (string.IsNullOrWhiteSpace(customerName))
                return BadRequest(new { message = "customerName is required." });

            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var deleted = await _transactionRepo.DeleteAllLoansForCustomerAsync(userId, customerName.Trim());
            return Ok(new { message = "All loan and payment records for this customer deleted.", deleted });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransactionDto dto)
        {
            try
            {
                if (!CustomerNameValidation.TryValidate(dto.CustomerName, out var customerName, out var nameError))
                    return BadRequest(new { message = nameError });

                var username = User.GetUsername();
                if (string.IsNullOrEmpty(username))
                    return Unauthorized(new { message = "Could not determine current user." });

                var appUser = await _userManager.FindByNameAsync(username);
                if (appUser == null)
                    return Unauthorized(new { message = "User not found." });

                var transactionType = string.IsNullOrWhiteSpace(dto.Type) ? "Buy" : dto.Type.Trim();
                string? itemsSummary = null;
                string? itemsJson = null;
                string? paymentMethod = null;

                if (string.Equals(transactionType, "Buy", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(transactionType, "Loan", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.Equals(transactionType, "Buy", StringComparison.OrdinalIgnoreCase))
                    {
                        var pm = dto.PaymentMethod?.Trim();
                        if (string.IsNullOrEmpty(pm))
                            paymentMethod = "Cash";
                        else if (string.Equals(pm, "Cash", StringComparison.OrdinalIgnoreCase))
                            paymentMethod = "Cash";
                        else if (string.Equals(pm, "Card", StringComparison.OrdinalIgnoreCase))
                            paymentMethod = "Card";
                        else if (string.Equals(pm, "UPI", StringComparison.OrdinalIgnoreCase))
                            paymentMethod = "UPI";
                        else
                            return BadRequest(new { message = "For Buy, PaymentMethod must be Cash, Card, or UPI." });
                    }

                    var cartItems = await _cartRepo.GetUserCart(appUser);
                    if (cartItems == null || cartItems.Count == 0)
                        return BadRequest(new { message = "Cart is empty. Add items before checkout." });

                    itemsSummary = string.Join(", ", cartItems.Select(i =>
                    {
                        var name = string.IsNullOrWhiteSpace(i.CompanyName) ? i.Symbol : i.CompanyName;
                        return $"{name} x{i.Quantity}";
                    }));

                    var sold = cartItems.Select(ToSoldItem).ToList();
                    itemsJson = JsonSerializer.Serialize(sold, JsonOptions);

                    foreach (var item in cartItems)
                    {
                        var stock = await _productRepo.GetByIdAsync(item.Id, appUser.Id);
                        if (stock == null || stock.Quantity < item.Quantity)
                            return BadRequest(new { message = "Out of stock. One or more items in your cart are no longer available. Please update your cart and try again." });
                    }
                    foreach (var item in cartItems)
                    {
                        await _productRepo.ReduceQuantityAsync(item.Id, item.Quantity, appUser.Id);
                    }
                    await _cartRepo.ClearUserCartAsync(appUser.Id);
                    await _cartParkingRepo.ClearActiveCustomerNameAsync(appUser.Id);
                }
                else if (string.Equals(transactionType, "LoanPayment", StringComparison.OrdinalIgnoreCase))
                {
                    var loanTransactions = await _transactionRepo.GetAllAsync(appUser.Id);
                    var customerLoanRows = loanTransactions.Where(t =>
                        string.Equals(t.CustomerName?.Trim(), customerName, StringComparison.OrdinalIgnoreCase)
                        && (string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase)));

                    var outstanding = customerLoanRows
                        .Where(t => string.Equals(t.Type, "Loan", StringComparison.OrdinalIgnoreCase))
                        .Sum(t => t.Total)
                        - customerLoanRows
                            .Where(t => string.Equals(t.Type, "LoanPayment", StringComparison.OrdinalIgnoreCase))
                            .Sum(t => t.Total);

                    if (outstanding <= 0)
                        return BadRequest(new { message = "This customer has no outstanding loan to pay." });

                    if (dto.Total > outstanding)
                        return BadRequest(new { message = $"Payment cannot exceed outstanding loan of {outstanding:0.##}." });
                }

                var transaction = new Transaction
                {
                    CustomerName = customerName,
                    Total = dto.Total,
                    Type = transactionType,
                    AppUserId = appUser.Id,
                    ItemsSummary = itemsSummary,
                    ItemsJson = itemsJson,
                    PaymentMethod = paymentMethod
                };
                await _transactionRepo.CreateAsync(transaction);
                return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, ToDto(transaction));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Transaction Create error: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                if (ex.InnerException != null)
                    Console.WriteLine($"Inner: {ex.InnerException.Message}");
                return StatusCode(500, new { message = "Error saving transaction.", error = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}
