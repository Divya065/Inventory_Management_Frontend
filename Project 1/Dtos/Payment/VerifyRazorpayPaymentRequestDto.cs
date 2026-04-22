using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Payment
{
    public class VerifyRazorpayPaymentRequestDto
    {
        [Required]
        public string RazorpayOrderId { get; set; } = string.Empty;

        [Required]
        public string RazorpayPaymentId { get; set; } = string.Empty;

        [Required]
        public string RazorpaySignature { get; set; } = string.Empty;
    }
}

