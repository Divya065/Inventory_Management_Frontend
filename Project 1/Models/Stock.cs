using Castle.MicroKernel.SubSystems.Conversion;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models;

[Table("Stocks")]
public class Stock
{
    public int Id { get; set; }
    public String Symbol { get; set; } = String.Empty;
    public string CompanyName { get; set; } = String.Empty;
    [Column(TypeName = "decimal(18,2)")]
    public decimal Purchase { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal LastDiv { get; set; }
    public String Industry { get; set; } = String.Empty;
    public long MarketCap { get; set; }
    public List<Comment> Comments { get; set; } = new List<Comment>();
    public List<Portfolio> Portfolios { get; set; } = new List<Portfolio>();
}
