namespace Project_1.Dtos.SuperAdmin
{
    public class PlatformOverviewDto
    {
        public int ShopCount { get; set; }
        public int ActivePlans { get; set; }
        public int ExpiringSoon { get; set; }
        public int Expired { get; set; }
        public int SuspendedShopCount { get; set; }
    }
}
