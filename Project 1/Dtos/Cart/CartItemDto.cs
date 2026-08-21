namespace Project_1.Dtos.Cart
{
    public class CartItemDto
    {
        public int Id { get; set; }
        public string Symbol { get; set; } = string.Empty;
        public string? Brand { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public decimal Price { get; set; }
        /// <summary>Physical quantity in cart (includes free units).</summary>
        public int Quantity { get; set; }
        /// <summary>Current inventory on hand (not reserved by cart).</summary>
        public int AvailableQuantity { get; set; }
        public long MarketCap { get; set; }
        public bool IsBuyOneGetOne { get; set; }
        public int BuyQty { get; set; }
        public int GetQty { get; set; }
        public string? OfferTitle { get; set; }
        /// <summary>Quantity used for billing.</summary>
        public int ChargeableQuantity { get; set; }
        public DateTime? ExpiryDate { get; set; }
        /// <summary>New / Old / Expired (computed from ExpiryDate).</summary>
        public string? ExpiryStatus { get; set; }
    }
}
