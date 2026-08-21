using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("Offers")]
    public class Offer
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        /// <summary>Legacy Buy 1 Get 1 flag. Prefer BuyQty/GetQty.</summary>
        public bool IsBuyOneGetOne { get; set; }
        /// <summary>Buy X Get Y: units paid per deal cycle. 0 = no cart deal.</summary>
        public int BuyQty { get; set; }
        /// <summary>Buy X Get Y: free units per deal cycle.</summary>
        public int GetQty { get; set; }
        /// <summary>Percentage off MRP applied to selling price (0 = none).</summary>
        public decimal DiscountPercent { get; set; }
        public DateTime CreatedOn { get; set; } = DateTime.Now;
        public int? ProductId { get; set; }
        public Product? Product { get; set; }
        public string? AppUserId { get; set; }
        public AppUser? AppUser { get; set; }

        public int EffectiveBuyQty =>
            BuyQty >= 1 ? BuyQty : (IsBuyOneGetOne ? 1 : 0);

        public int EffectiveGetQty =>
            GetQty >= 1 ? GetQty : (IsBuyOneGetOne ? 1 : 0);
    }
}
