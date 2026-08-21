namespace Project_1.Dtos.Transaction
{
    public class DayCloseDto
    {
        public string Date { get; set; } = "";
        public int BuyCount { get; set; }
        public decimal CashSales { get; set; }
        public decimal CardSales { get; set; }
        public decimal OnlineSales { get; set; }
        public decimal OtherSales { get; set; }
        public decimal TotalSales { get; set; }
        public int LoanCount { get; set; }
        public decimal LoansGiven { get; set; }
        public int LoanPaymentCount { get; set; }
        public decimal LoanPayments { get; set; }
        /// <summary>Cash sales + loan payments (typical drawer cash).</summary>
        public decimal ExpectedCashInDrawer { get; set; }
    }
}
