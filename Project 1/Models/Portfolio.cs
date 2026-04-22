using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("Portfolios")]
    public class Portfolio
    {
        public String AppUserId { get; set; }
        public int StockID { get; set; }
        public int Quantity { get; set; } = 1; // How many the user wants in cart
        public AppUser AppUser { get; set; }
        public Stock Stock { get; set; }
    }
}
