using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("CartItems")]
    public class CartItem
    {
        public string AppUserId { get; set; }
        public int ProductID { get; set; }
        /// <summary>Physical units in cart (includes free units from deals).</summary>
        public int Quantity { get; set; } = 1;
        /// <summary>Units the customer pays for. Null = treat Quantity as paid (no deal).</summary>
        public int? PaidQuantity { get; set; }
        public AppUser AppUser { get; set; }
        public Product Product { get; set; }
    }
}
