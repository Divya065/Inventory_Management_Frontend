using Project_1.Dtos.Comment;
using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Dtos.Stock
{
    public class StockDto
    {
        public int Id { get; set; }
        public String Symbol { get; set; } = String.Empty;
        public string CompanyName { get; set; } = String.Empty;
        public decimal Purchase { get; set; }
        public decimal LastDiv { get; set; }
        public String Industry { get; set; } = String.Empty;
        public long MarketCap { get; set; }
        public List<CommentDto> Comments { get; set; }
    }
}
