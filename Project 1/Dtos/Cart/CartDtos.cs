namespace Project_1.Dtos.Cart
{
    public class ParkCartRequestDto
    {
        public string CustomerName { get; set; } = string.Empty;
    }

    public class ParkedCartItemDto
    {
        public int ProductId { get; set; }
        /// <summary>Legacy parked-cart JSON field.</summary>
        public int StockId
        {
            get => ProductId;
            set { if (value > 0) ProductId = value; }
        }
        public string Symbol { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class ParkedCartSummaryDto
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public decimal EstimatedTotal { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    public class ActiveCartSummaryDto
    {
        public string? CustomerName { get; set; }
        public int ItemCount { get; set; }
        public decimal EstimatedTotal { get; set; }
        public bool HasSavedCustomerName { get; set; }
    }

    public class CartWorkspaceDto
    {
        public ActiveCartSummaryDto Active { get; set; } = new();
        public List<ParkedCartSummaryDto> Parked { get; set; } = new();
    }
}
