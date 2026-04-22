namespace Project_1.Dtos.Offer
{
    public class OfferDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedOn { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public int? StockId { get; set; }
    }
}
