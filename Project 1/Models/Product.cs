using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models;

[Table("Products")]
public class Product
{
    public int Id { get; set; }
    public String Symbol { get; set; } = String.Empty;

    /// <summary>Brand / manufacturer (e.g. Nestlé). Used for search and grouping.</summary>
    [MaxLength(120)]
    public string? Brand { get; set; }

    /// <summary>Product display name (e.g. Maggi 70g).</summary>
    public string CompanyName { get; set; } = String.Empty;

    /// <summary>Manufacturer or store barcode used by USB scanners at checkout.</summary>
    [MaxLength(64)]
    public string? Barcode { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public long MarketCap { get; set; }

    /// <summary>Optional product expiry date.</summary>
    public DateTime? ExpiryDate { get; set; }

    /// <summary>Shop that owns this catalog item. Null only for legacy rows before tenancy.</summary>
    public string? OwnerUserId { get; set; }
    public AppUser? Owner { get; set; }

    public List<Offer> Offers { get; set; } = new List<Offer>();
    public List<CartItem> CartItems { get; set; } = new List<CartItem>();
}
