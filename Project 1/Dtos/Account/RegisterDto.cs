using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Account
{
    public class RegisterDto
    {
        [Required]
        public String? Username { get; set; }
        [Required]
        [EmailAddress]
        public String? Email { get; set; }
        [Required]
        public String? Password { get; set; }
    }
}
