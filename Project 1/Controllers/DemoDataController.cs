using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Extentions;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/demo-data")]
    [ApiController]
    [Authorize]
    public class DemoDataController : ControllerBase
    {
        private readonly ApplicationDBContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly IWebHostEnvironment _environment;

        public DemoDataController(
            ApplicationDBContext context,
            UserManager<AppUser> userManager,
            IWebHostEnvironment environment)
        {
            _context = context;
            _userManager = userManager;
            _environment = environment;
        }

        [HttpPost("australia")]
        public async Task<IActionResult> SeedAustraliaDemoData()
        {
            var username = User.GetUsername();
            var appUser = string.IsNullOrWhiteSpace(username)
                ? null
                : await _userManager.FindByNameAsync(username);

            if (appUser == null)
                return Unauthorized(new { message = "Login first, then seed demo data." });

            var result = await SeedForUserAsync(appUser);
            return Ok(new
            {
                message = "Australia demo data seeded successfully.",
                products = result.Products,
                cartItems = result.CartItems,
                buyTransactions = result.BuyTransactions,
                loanRecords = result.LoanRecords
            });
        }

        [HttpPost("australia-demo-login")]
        [AllowAnonymous]
        public async Task<IActionResult> SeedAustraliaDemoLogin()
        {
            if (!_environment.IsDevelopment())
                return NotFound();

            const string demoUsername = "australia.client";
            const string demoEmail = "australia.client@example.com";
            const string demoPassword = "AustraliaDemo@123";

            var appUser = await _userManager.FindByNameAsync(demoUsername);
            if (appUser == null)
            {
                appUser = new AppUser
                {
                    UserName = demoUsername,
                    Email = demoEmail
                };

                var createResult = await _userManager.CreateAsync(appUser, demoPassword);
                if (!createResult.Succeeded)
                    return BadRequest(new { message = "Could not create demo user.", errors = createResult.Errors });

                if (await _context.Roles.AnyAsync(r => r.Name == "User"))
                    await _userManager.AddToRoleAsync(appUser, "User");
            }

            var result = await SeedForUserAsync(appUser);
            return Ok(new
            {
                message = "Australia client demo is ready.",
                login = new
                {
                    username = demoUsername,
                    email = demoEmail,
                    password = demoPassword
                },
                products = result.Products,
                cartItems = result.CartItems,
                buyTransactions = result.BuyTransactions,
                loanRecords = result.LoanRecords
            });
        }

        private async Task<AustraliaSeedResult> SeedForUserAsync(AppUser appUser)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.Portfolios.RemoveRange(_context.Portfolios);
            _context.Offers.RemoveRange(_context.Offers);
            _context.Stocks.RemoveRange(_context.Stocks);
            _context.Transactions.RemoveRange(_context.Transactions.Where(t => t.AppUserId == appUser.Id));
            _context.PaymentOrders.RemoveRange(_context.PaymentOrders.Where(p => p.AppUserId == appUser.Id));
            await _context.SaveChangesAsync();

            var products = CreateAustralianProducts();
            await _context.Stocks.AddRangeAsync(products);
            await _context.SaveChangesAsync();

            var productLookup = products.ToDictionary(p => p.Symbol, p => p);
            await _context.Portfolios.AddRangeAsync(CreateDemoCart(appUser.Id, productLookup));

            var purchases = CreatePurchaseHistory(appUser.Id, productLookup);
            var loanHistory = CreateLoanHistory(appUser.Id);

            await _context.SaveChangesAsync();
            await _context.Transactions.AddRangeAsync(purchases);
            await _context.Transactions.AddRangeAsync(loanHistory);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new AustraliaSeedResult(products.Count, 4, purchases.Count, loanHistory.Count);
        }

        private sealed record AustraliaSeedResult(int Products, int CartItems, int BuyTransactions, int LoanRecords);

        private static List<Stock> CreateAustralianProducts()
        {
            var items = new (string Symbol, string Name, decimal Price, int Quantity, long MarketCap)[]
            {
                ("AU001", "Australian Manuka Honey 500g", 18.95m, 42, 2500000),
                ("AU002", "Tim Tam Original Biscuits", 4.50m, 95, 3200000),
                ("AU003", "Vegemite Spread 380g", 6.25m, 75, 4100000),
                ("AU004", "Milo Chocolate Malt 460g", 8.40m, 66, 3800000),
                ("AU005", "Arnott's Shapes BBQ", 3.80m, 88, 1800000),
                ("AU006", "Bundaberg Ginger Beer 4 Pack", 9.90m, 50, 2900000),
                ("AU007", "Golden Circle Pineapple Slices", 3.25m, 64, 1250000),
                ("AU008", "Bega Peanut Butter Smooth", 5.95m, 39, 2100000),
                ("AU009", "Uncle Tobys Oats 1kg", 5.60m, 70, 2300000),
                ("AU010", "Weet-Bix Family Pack", 6.85m, 80, 4200000),
                ("AU011", "Carman's Muesli Bars", 5.25m, 58, 1600000),
                ("AU012", "Red Rock Deli Sea Salt Chips", 4.90m, 46, 1750000),
                ("AU013", "Smith's Crinkle Cut Original", 3.70m, 73, 2000000),
                ("AU014", "Cottee's Cordial Raspberry", 5.30m, 52, 1300000),
                ("AU015", "Cadbury Dairy Milk Australia", 4.20m, 92, 5000000),
                ("AU016", "Darrell Lea Soft Liquorice", 4.75m, 61, 1100000),
                ("AU017", "Haigh's Milk Chocolate Bar", 9.95m, 28, 2200000),
                ("AU018", "Byron Bay Cookie Triple Choc", 5.95m, 37, 950000),
                ("AU019", "Fruit Chutney Australian Made", 7.10m, 0, 800000),
                ("AU020", "Macadamia Nuts Roasted 250g", 13.50m, 31, 2600000),
                ("AU021", "Australian Extra Virgin Olive Oil", 12.95m, 34, 3600000),
                ("AU022", "Tasmanian Leatherwood Honey", 16.80m, 24, 1700000),
                ("AU023", "Kangaroo Island Sea Salt", 8.95m, 44, 760000),
                ("AU024", "Barossa Shiraz Sauce", 10.50m, 5, 840000),
                ("AU025", "Margaret River Coffee Beans 500g", 19.90m, 29, 1400000),
                ("AU026", "Melbourne Breakfast Tea", 11.40m, 40, 1050000),
                ("AU027", "Sydney Harbour Blend Coffee", 18.75m, 35, 1180000),
                ("AU028", "Queensland Mango Jam", 7.80m, 48, 890000),
                ("AU029", "Australian Bush Tomato Relish", 9.60m, 22, 720000),
                ("AU030", "Wattleseed Dessert Sauce", 12.25m, 19, 650000),
                ("AU031", "Akubra Wool Hat Cleaner", 14.95m, 16, 560000),
                ("AU032", "Ugg Boot Care Kit", 24.90m, 20, 1250000),
                ("AU033", "Australian Merino Wool Socks", 17.50m, 55, 2100000),
                ("AU034", "Bonds Cotton T-Shirt", 15.00m, 85, 3000000),
                ("AU035", "RM Williams Leather Conditioner", 22.95m, 4, 1450000),
                ("AU036", "Surf Zinc Sunscreen SPF50+", 13.95m, 60, 1750000),
                ("AU037", "Cancer Council Sunscreen 1L", 24.00m, 36, 4200000),
                ("AU038", "Aesop Hand Balm 75ml", 33.00m, 21, 9000000),
                ("AU039", "Lucas Papaw Ointment", 6.70m, 78, 2300000),
                ("AU040", "Thursday Plantation Tea Tree Oil", 11.20m, 49, 1600000),
                ("AU041", "Bondi Sands Self Tanning Foam", 19.95m, 30, 2600000),
                ("AU042", "Sukin Facial Moisturiser", 12.50m, 45, 1900000),
                ("AU043", "Jurlique Rose Hand Cream", 29.50m, 3, 2400000),
                ("AU044", "Natio Daily Defence Cream", 18.95m, 26, 1500000),
                ("AU045", "EcoStore Laundry Liquid", 10.95m, 33, 1300000),
                ("AU046", "Koala Eco Multi-Purpose Cleaner", 12.80m, 41, 980000),
                ("AU047", "Aussie Made Dishwashing Liquid", 4.95m, 67, 540000),
                ("AU048", "Woolworths Reusable Shopping Bag", 1.50m, 150, 300000),
                ("AU049", "Coles Kitchen Paper Towels", 3.95m, 90, 850000),
                ("AU050", "Glad Wrap Australia Roll", 4.40m, 72, 920000),
                ("AU051", "Sistema Lunch Box", 8.95m, 46, 1700000),
                ("AU052", "Decor Food Storage Set", 14.25m, 25, 1100000),
                ("AU053", "KeepCup Reusable Coffee Cup", 19.95m, 32, 2800000),
                ("AU054", "Frank Green Ceramic Bottle", 39.95m, 18, 3600000),
                ("AU055", "Australian Bamboo Toothbrush Pack", 6.95m, 62, 640000),
                ("AU056", "Outback Insect Repellent", 9.95m, 52, 1250000),
                ("AU057", "Aerogard Tropical Strength", 8.75m, 57, 2100000),
                ("AU058", "Bushman Repellent Gel", 11.50m, 39, 1800000),
                ("AU059", "Bunnings Garden Gloves", 7.90m, 44, 1200000),
                ("AU060", "Seasol Seaweed Concentrate", 14.95m, 27, 2500000),
                ("AU061", "Yates Dynamic Lifter 7kg", 18.50m, 23, 1900000),
                ("AU062", "Native Plant Potting Mix", 12.20m, 30, 780000),
                ("AU063", "Aussie BBQ Charcoal 5kg", 16.95m, 34, 960000),
                ("AU064", "Heat Beads BBQ Briquettes", 13.75m, 42, 1450000),
                ("AU065", "MasterFoods BBQ Sauce", 4.60m, 76, 2200000),
                ("AU066", "Rosella Tomato Sauce", 4.25m, 69, 1600000),
                ("AU067", "Four'N Twenty Meat Pie", 6.50m, 54, 2500000),
                ("AU068", "Patties Party Pies", 8.90m, 38, 1700000),
                ("AU069", "Tip Top White Bread", 3.60m, 82, 2800000),
                ("AU070", "Helga's Mixed Grain Bread", 5.20m, 64, 2100000),
                ("AU071", "Devondale Full Cream Milk 2L", 4.10m, 92, 3600000),
                ("AU072", "Bega Tasty Cheese Block", 8.75m, 47, 3300000),
                ("AU073", "Mainland Buttersoft", 6.95m, 43, 1900000),
                ("AU074", "Pauls Vanilla Custard", 4.85m, 36, 1500000),
                ("AU075", "Bulla Creamy Classics Ice Cream", 7.95m, 31, 2400000),
                ("AU076", "Golden Gaytime 4 Pack", 8.50m, 29, 3000000),
                ("AU077", "Zooper Dooper 24 Pack", 5.95m, 70, 2100000),
                ("AU078", "Mount Franklin Water 24 Pack", 11.95m, 50, 2600000),
                ("AU079", "Pump Spring Water 750ml", 3.20m, 88, 1700000),
                ("AU080", "V Energy Drink 4 Pack", 9.50m, 45, 3500000),
                ("AU081", "Solo Lemon Drink 1.25L", 3.15m, 63, 1850000),
                ("AU082", "Lift Lemon Drink 1.25L", 3.15m, 58, 1450000),
                ("AU083", "Kirks Lemon Squash Cans", 7.95m, 42, 1300000),
                ("AU084", "Coopers Pale Ale Sauce", 6.95m, 22, 1100000),
                ("AU085", "Non-Alcoholic Ginger Beer", 8.90m, 40, 900000),
                ("AU086", "Australian Almond Milk", 4.80m, 53, 1400000),
                ("AU087", "Oatly Barista Blend Australia", 5.75m, 35, 2400000),
                ("AU088", "Sanitarium So Good Soy Milk", 3.90m, 61, 2100000),
                ("AU089", "Fruit Mince Pies 6 Pack", 7.50m, 5, 700000),
                ("AU090", "Lamington Sponge Pack", 6.95m, 33, 930000),
                ("AU091", "Pavlova Base Large", 9.95m, 26, 650000),
                ("AU092", "Anzac Biscuits Tin", 8.80m, 48, 860000),
                ("AU093", "Australian Protein Bar Choc", 4.95m, 74, 1500000),
                ("AU094", "Up&Go Breakfast Drink", 7.25m, 52, 2900000),
                ("AU095", "Powerade Mountain Blast", 3.75m, 47, 3400000),
                ("AU096", "Aussie Dog Treats Kangaroo", 12.95m, 28, 1200000),
                ("AU097", "Black Hawk Dog Food 3kg", 32.50m, 2, 3100000),
                ("AU098", "Whiskas Australia Cat Food", 18.95m, 24, 2700000),
                ("AU099", "Sorbent Toilet Tissue 24 Pack", 14.95m, 56, 2200000),
                ("AU100", "Quilton Toilet Tissue 20 Pack", 16.50m, 49, 2600000),
            };

            return items.Select(i => new Stock
            {
                Symbol = i.Symbol,
                CompanyName = i.Name,
                Price = i.Price,
                Quantity = i.Quantity,
                // Use MarketCap column as "Original price (MRP)" for retail demo
                MarketCap = (long)Math.Round((double)(i.Price * 1.25m), 0, MidpointRounding.AwayFromZero)
            }).ToList();
        }

        private static List<Portfolio> CreateDemoCart(string userId, Dictionary<string, Stock> products)
        {
            return new List<Portfolio>
            {
                new Portfolio { AppUserId = userId, StockID = products["AU002"].Id, Quantity = 2 },
                new Portfolio { AppUserId = userId, StockID = products["AU006"].Id, Quantity = 1 },
                new Portfolio { AppUserId = userId, StockID = products["AU020"].Id, Quantity = 3 },
                new Portfolio { AppUserId = userId, StockID = products["AU071"].Id, Quantity = 2 },
            };
        }

        private static List<Transaction> CreatePurchaseHistory(string userId, Dictionary<string, Stock> products)
        {
            var customerNames = new[]
            {
                "Oliver Smith", "Charlotte Brown", "Jack Wilson", "Amelia Taylor", "Noah Johnson",
                "Isla Anderson", "William Martin", "Mia Thompson", "Thomas Walker", "Grace Harris",
                "James White", "Ava Robinson", "Lucas King", "Sophie Wright", "Ethan Scott"
            };

            var symbols = products.Keys.ToArray();
            var purchases = new List<Transaction>();
            var start = DateTime.UtcNow.Date.AddDays(-80);

            for (var i = 0; i < 75; i++)
            {
                var selected = new[] { symbols[(i * 3) % symbols.Length], symbols[(i * 7 + 5) % symbols.Length] }
                    .Select(symbol => products[symbol])
                    .ToList();

                var total = selected
                    .Select((item, index) => item.Price * (index + 1))
                    .Sum();
                purchases.Add(new Transaction
                {
                    CustomerName = customerNames[i % customerNames.Length],
                    Total = Math.Round(total, 2),
                    Type = "Buy",
                    CreatedOn = start.AddDays(i).AddHours(9 + (i % 8)),
                    ItemsSummary = string.Join(", ", selected.Select((item, index) => $"{item.CompanyName} x{index + 1}")),
                    PaymentMethod = i % 3 == 0 ? "Cash" : "Razorpay",
                    AppUserId = userId
                });
            }

            return purchases;
        }

        private static List<Transaction> CreateLoanHistory(string userId)
        {
            var rows = new List<Transaction>();
            var data = new[]
            {
                ("Liam Cooper", 185.50m, 65.00m),
                ("Ruby Mitchell", 320.00m, 120.00m),
                ("Henry Clarke", 142.75m, 0m),
                ("Matilda Lewis", 275.20m, 275.20m),
                ("Archie Young", 410.90m, 160.00m),
                ("Chloe Hall", 95.40m, 25.00m),
                ("Hudson Allen", 230.00m, 100.00m),
                ("Ella Phillips", 165.80m, 0m),
                ("Charlie Campbell", 510.45m, 210.00m),
                ("Zoe Parker", 88.95m, 88.95m),
            };

            var start = DateTime.UtcNow.Date.AddDays(-45);
            for (var i = 0; i < data.Length; i++)
            {
                var item = data[i];
                rows.Add(new Transaction
                {
                    CustomerName = item.Item1,
                    Total = item.Item2,
                    Type = "Loan",
                    CreatedOn = start.AddDays(i * 3).AddHours(11),
                    ItemsSummary = "Demo credit sale",
                    AppUserId = userId
                });

                if (item.Item3 > 0)
                {
                    rows.Add(new Transaction
                    {
                        CustomerName = item.Item1,
                        Total = item.Item3,
                        Type = "LoanPayment",
                        CreatedOn = start.AddDays(i * 3 + 7).AddHours(15),
                        ItemsSummary = "Demo loan payment",
                        AppUserId = userId
                    });
                }
            }

            return rows;
        }
    }
}
