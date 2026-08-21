namespace Project_1.Dtos.SuperAdmin
{
    public class ShopAccountDto
    {
        public string Id { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ShopName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Plan { get; set; } = "None";
        public string PlanStatus { get; set; } = "NeverSubscribed";
        public int DaysLeft { get; set; }
        public DateTime? PlanExpiresAt { get; set; }
        public bool HasUsedTrial { get; set; }
    }
}
