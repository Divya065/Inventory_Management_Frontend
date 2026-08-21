using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    /// <summary>
    /// Per-user workspace for the active cart (e.g. customer name after resume from park).
    /// </summary>
    [Table("CartStates")]
    public class CartState
    {
        [Key]
        [MaxLength(450)]
        public string AppUserId { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? ActiveCustomerName { get; set; }
    }
}
