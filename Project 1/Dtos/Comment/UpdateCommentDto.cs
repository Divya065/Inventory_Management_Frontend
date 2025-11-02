using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Comment
{
    public class UpdateCommentDto
    {
        [Required]
        [MinLength(5, ErrorMessage = "Title should be more than 5 characters")]
        [MaxLength(280, ErrorMessage = "Title cannot be over 280 characters")]
        public string Title { get; set; } = String.Empty;
        [Required]
        [MinLength(5, ErrorMessage = "Content should be more than 5 characters")]
        [MaxLength(280, ErrorMessage = "Content cannot be over 280 characters")]
        public string Content { get; set; } = String.Empty;
    }
}
