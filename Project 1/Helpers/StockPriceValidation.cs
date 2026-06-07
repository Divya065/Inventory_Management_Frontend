namespace Project_1.Helpers
{
    public static class StockPriceValidation
    {
        public static bool TryValidate(decimal price, long marketCap, out string error)
        {
            if (price < 0)
            {
                error = "Price cannot be negative.";
                return false;
            }

            if (marketCap < 0)
            {
                error = "Original price (MRP) cannot be negative.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        public static decimal NormalizePrice(decimal price) => price < 0 ? 0 : price;

        public static long NormalizeMarketCap(long marketCap) => marketCap < 0 ? 0 : marketCap;
    }
}
