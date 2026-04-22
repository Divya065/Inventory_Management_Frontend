namespace Project_1.Dtos.Transaction
{
    public class LoanSummaryDto
    {
        public string CustomerName { get; set; } = string.Empty;
        public decimal TotalLoan { get; set; }
        public decimal TotalBorrowed { get; set; }
        public decimal TotalPaid { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Partial, Paid
        public int TransactionCount { get; set; }
        public DateTime? LastLoanDate { get; set; }
    }
}
