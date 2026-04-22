using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Project_1.Dtos.Transaction;
using Project_1.Extentions;
using Project_1.Interface;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly ITransactionRepository _transactionRepo;
        private readonly UserManager<AppUser> _userManager;
        private readonly IPortfolioRepository _portfolioRepo;
        private readonly IStockRepository _stockRepo;

        public TransactionController(
            ITransactionRepository transactionRepo,
            UserManager<AppUser> userManager,
            IPortfolioRepository portfolioRepo,
            IStockRepository stockRepo)
        {
            _transactionRepo = transactionRepo;
            _userManager = userManager;
            _portfolioRepo = portfolioRepo;
            _stockRepo = stockRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            var transactions = await _transactionRepo.GetAllAsync(userId);
            var dtos = transactions.Select(t => new TransactionDto
            {
                Id = t.Id,
                CustomerName = t.CustomerName,
                Total = t.Total,
                Type = t.Type,
                CreatedOn = t.CreatedOn,
                ItemsSummary = t.ItemsSummary,
                PaymentMethod = t.PaymentMethod
            }).ToList();
            return Ok(dtos);
        }

        /// <summary>Get loan summary per customer: total loan = sum of all Loan transactions for that person.</summary>
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

        /// <summary>Get all loan/payment transactions for a specific customer (for detail view).</summary>
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
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    CustomerName = t.CustomerName,
                    Total = t.Total,
                    Type = t.Type ?? "Loan",
                    CreatedOn = t.CreatedOn,
                    ItemsSummary = t.ItemsSummary,
                    PaymentMethod = t.PaymentMethod
                })
                .ToList();

            return Ok(list);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var t = await _transactionRepo.GetByIdAsync(id);
            if (t == null)
                return NotFound();
            return Ok(new TransactionDto
            {
                Id = t.Id,
                CustomerName = t.CustomerName,
                Total = t.Total,
                Type = t.Type,
                CreatedOn = t.CreatedOn,
                ItemsSummary = t.ItemsSummary,
                PaymentMethod = t.PaymentMethod
            });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteOne([FromRoute] int id)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Could not determine current user." });

            var ok = await _transactionRepo.DeleteOneAsync(id, userId);
            if (!ok)
                return NotFound(new { message = "Transaction not found." });

            return NoContent();
        }

        [HttpDelete("all")]
        public async Task<IActionResult> DeleteAll()
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userId = appUser?.Id;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Could not determine current user." });

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
                return Unauthorized(new { message = "Could not determine current user." });

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
                return Unauthorized(new { message = "Could not determine current user." });

            var deleted = await _transactionRepo.DeleteAllLoansForCustomerAsync(userId, customerName.Trim());
            return Ok(new { message = "All loan and payment records for this customer deleted.", deleted });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransactionDto? dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { message = "Request body is required (CustomerName, Total, Type)." });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var username = User.GetUsername();
                if (string.IsNullOrEmpty(username))
                    return Unauthorized(new { message = "Could not determine current user." });

                var appUser = await _userManager.FindByNameAsync(username);
                if (appUser == null)
                    return Unauthorized(new { message = "User not found." });

                var transactionType = string.IsNullOrWhiteSpace(dto.Type) ? "Buy" : dto.Type.Trim();
                string? itemsSummary = null;
                string? paymentMethod = null;

                // On Buy: validate stock then reduce inventory and clear cart
                if (string.Equals(transactionType, "Buy", StringComparison.OrdinalIgnoreCase))
                {
                    var pm = dto.PaymentMethod?.Trim();
                    if (string.IsNullOrEmpty(pm))
                        paymentMethod = "Cash";
                    else if (string.Equals(pm, "Cash", StringComparison.OrdinalIgnoreCase))
                        paymentMethod = "Cash";
                    else if (string.Equals(pm, "UPI", StringComparison.OrdinalIgnoreCase))
                        paymentMethod = "UPI";
                    else
                        return BadRequest(new { message = "For Buy, PaymentMethod must be Cash or UPI." });
                    var cartItems = await _portfolioRepo.GetUserPortfolio(appUser);
                    if (cartItems == null || cartItems.Count == 0)
                        return BadRequest(new { message = "Cart is empty. Add items before buying." });

                    // Build a simple summary like "Milk x2, Bread x1" before we clear the cart
                    itemsSummary = string.Join(", ", cartItems.Select(i =>
                    {
                        var name = string.IsNullOrWhiteSpace(i.CompanyName) ? i.Symbol : i.CompanyName;
                        return $"{name} x{i.Quantity}";
                    }));

                    foreach (var item in cartItems)
                    {
                        var stock = await _stockRepo.GetByIdAsync(item.Id);
                        if (stock == null || stock.Quantity < item.Quantity)
                            return BadRequest(new { message = "Out of stock. One or more items in your cart are no longer available. Please update your cart and try again." });
                    }
                    foreach (var item in cartItems)
                    {
                        await _stockRepo.ReduceQuantityAsync(item.Id, item.Quantity);
                    }
                    await _portfolioRepo.ClearUserPortfolioAsync(appUser.Id);
                }
                // On Loan: clear cart after recording the loan transaction
                else if (string.Equals(transactionType, "Loan", StringComparison.OrdinalIgnoreCase))
                {
                    await _portfolioRepo.ClearUserPortfolioAsync(appUser.Id);
                }

                var transaction = new Transaction
                {
                    CustomerName = dto.CustomerName?.Trim() ?? "",
                    Total = dto.Total,
                    Type = transactionType,
                    AppUserId = appUser.Id,
                    ItemsSummary = itemsSummary,
                    PaymentMethod = paymentMethod
                };
                await _transactionRepo.CreateAsync(transaction);
                return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, new TransactionDto
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
