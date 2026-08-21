namespace Project_1.Helpers;

/// <summary>
/// New / Old / Expired from expiry date. No DB column — computed.
/// Old = expires within <see cref="NearExpiryDays"/> days (inclusive).
/// </summary>
public static class ExpiryFreshness
{
    public const int NearExpiryDays = 30;

    public static string? Status(DateTime? expiryDate, DateTime? asOf = null)
    {
        if (!expiryDate.HasValue)
            return null;

        var today = (asOf ?? DateTime.UtcNow).Date;
        var exp = expiryDate.Value.Date;
        if (exp < today)
            return "Expired";
        if (exp <= today.AddDays(NearExpiryDays))
            return "Old";
        return "New";
    }
}
