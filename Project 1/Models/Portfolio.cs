using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("Portfolios")]
    public class Portfolio
    {
        public String AppUserId { get; set; }
        public int StockID { get; set; }
        public AppUser AppUser { get; set; }
        public Stock Stock { get; set; }
    }
}
