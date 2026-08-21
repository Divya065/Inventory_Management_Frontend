using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Subscription
{
    public class ChoosePlanDto
    {
        [Required]
        public string Plan { get; set; } = string.Empty;
    }
}
