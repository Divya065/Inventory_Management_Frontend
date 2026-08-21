using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("ParkedCarts")]
    public class ParkedCart
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(450)]
        public string AppUserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        /// <summary>JSON array of { productId, stockId, symbol, quantity }.</summary>
        [Required]
        public string ItemsJson { get; set; } = "[]";

        public int ItemCount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal EstimatedTotal { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
