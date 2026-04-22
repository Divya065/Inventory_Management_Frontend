using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models;

[Table("Stocks")]
public class Stock
{
    public int Id { get; set; }
    public String Symbol { get; set; } = String.Empty;
    public string CompanyName { get; set; } = String.Empty;
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public long MarketCap { get; set; }
    public List<Offer> Offers { get; set; } = new List<Offer>();
    public List<Portfolio> Portfolios { get; set; } = new List<Portfolio>();
}
