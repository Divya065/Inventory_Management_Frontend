using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Payment
{
    public class CreateRazorpayOrderRequestDto
    {
        /// <summary>Customer name to print on receipt after payment.</summary>
        [Required]
        [MinLength(1)]
        [MaxLength(200)]
        [RegularExpression(@"^[A-Za-z]+(?:\s+[A-Za-z]+)*$", ErrorMessage = "Customer name must contain only letters (A–Z). Spaces between words are allowed.")]
        public string CustomerName { get; set; } = string.Empty;
    }
}

