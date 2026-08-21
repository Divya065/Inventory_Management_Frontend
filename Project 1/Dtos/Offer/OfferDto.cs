namespace Project_1.Dtos.Offer
{
    public class OfferDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsBuyOneGetOne { get; set; }
        public int BuyQty { get; set; }
        public int GetQty { get; set; }
        public decimal DiscountPercent { get; set; }
        public DateTime CreatedOn { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public int? ProductId { get; set; }
        /// <summary>Legacy alias for older clients.</summary>
        public int? StockId
        {
            get => ProductId;
            set { if (value.HasValue) ProductId = value; }
        }
    }
}
