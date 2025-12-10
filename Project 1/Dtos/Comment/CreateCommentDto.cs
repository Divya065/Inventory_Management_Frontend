using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Project_1.Dtos.Comment
{
    public class CreateCommentDto
    {
        [Required(ErrorMessage = "The Title field is required.")]
        [MinLength(5, ErrorMessage = "Title should be more than 5 characters")]
        [MaxLength(280, ErrorMessage = "Title cannot be over 280 characters")]
        [JsonProperty("title")]
        public string Title { get; set; } = String.Empty;
        
        [Required(ErrorMessage = "The Content field is required.")]
        [MinLength(5, ErrorMessage = "Content should be more than 5 characters")]
        [MaxLength(280, ErrorMessage = "content cannot be over 280 characters")]
        [JsonProperty("content")]
        public string Content { get; set; } = String.Empty;
    }
}
