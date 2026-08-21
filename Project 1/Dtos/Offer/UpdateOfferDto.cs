using System.ComponentModel.DataAnnotations;

namespace Project_1.Dtos.Offer
{
    public class UpdateOfferDto
    {
        [Required]
        [MinLength(5)]
        [MaxLength(280)]
        public string Title { get; set; } = String.Empty;
        [Required]
        [MinLength(5)]
        [MaxLength(280)]
        public string Content { get; set; } = String.Empty;
        public bool IsBuyOneGetOne { get; set; }
        [Range(0, 100)]
        public int BuyQty { get; set; }
        [Range(0, 100)]
        public int GetQty { get; set; }
        [Range(0, 100)]
        public decimal DiscountPercent { get; set; }
    }
}
