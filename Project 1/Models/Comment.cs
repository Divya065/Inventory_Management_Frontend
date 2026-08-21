using System.ComponentModel.DataAnnotations.Schema;

namespace Project_1.Models
{
    [Table("Comments")]
    public class Comment
    {
        public int Id { get; set; }
        public string Title { get; set; }=String.Empty;
        public string Content { get; set; }=String.Empty;
        public DateTime CreatedOn { get; set; } = DateTime.Now;
        public int? ProductId { get; set; }
        public Product? Product { get; set; }
        public string? AppUserId { get; set; }
        public AppUser? AppUser { get; set; }
    }
}
