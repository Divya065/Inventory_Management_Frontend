namespace Project_1.Dtos.Transaction;

/// <summary>Snapshot of a sold/loaned cart line for revert + receipt.</summary>
public class SoldItemDto
{
    public int ProductId { get; set; }
    /// <summary>Legacy JSON field from older receipts / parked carts.</summary>
    public int StockId
    {
        get => ProductId;
        set { if (value > 0) ProductId = value; }
    }
    public int Quantity { get; set; }
    public string? Symbol { get; set; }
    public string? Name { get; set; }
    public string? OfferTitle { get; set; }
    public DateTime? ExpiryDate { get; set; }
    /// <summary>New / Old / Expired at time of sale.</summary>
    public string? ExpiryStatus { get; set; }
}
