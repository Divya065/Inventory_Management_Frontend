namespace Project_1.Helpers
{
    public static class BogoPricing
    {
        public static bool IsActiveDeal(int buyQty, int getQty) => buyQty >= 1 && getQty >= 1;

        public static string DealLabel(int buyQty, int getQty)
        {
            if (!IsActiveDeal(buyQty, getQty)) return string.Empty;
            return $"Buy {buyQty} Get {getQty} Free";
        }

        /// <summary>Physical units in cart for a paid quantity under Buy X Get Y.</summary>
        public static int PhysicalQuantity(int paidQuantity, int buyQty, int getQty)
        {
            var paid = paidQuantity < 1 ? 1 : paidQuantity;
            if (!IsActiveDeal(buyQty, getQty)) return paid;
            return paid + (paid / buyQty) * getQty;
        }

        /// <summary>Max paid qty that fits in remaining physical stock.</summary>
        public static int MaxPaidQuantity(int remainingPhysical, int buyQty, int getQty)
        {
            if (remainingPhysical <= 0) return 0;
            if (!IsActiveDeal(buyQty, getQty)) return remainingPhysical;
            for (var paid = remainingPhysical; paid >= 1; paid--)
            {
                if (PhysicalQuantity(paid, buyQty, getQty) <= remainingPhysical)
                    return paid;
            }
            return 0;
        }

        /// <summary>Legacy helper for Buy 1 Get 1 only.</summary>
        public static int ChargeableQuantity(int cartQuantity, bool isBuyOneGetOne)
        {
            var qty = cartQuantity < 1 ? 1 : cartQuantity;
            if (!isBuyOneGetOne) return qty;
            return (qty + 1) / 2;
        }
    }
}
