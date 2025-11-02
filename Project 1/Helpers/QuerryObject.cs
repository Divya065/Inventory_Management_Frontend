namespace Project_1.Helpers
{
    public class QuerryObject
    {
        public String? Symbol { get; set; } = null;
        public String? CompanyName { get; set; } = null;
        public String? SortBy { get; set; } = null;
        public bool IsDecending { get; set; } = false;
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
