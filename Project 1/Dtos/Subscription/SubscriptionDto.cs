namespace Project_1.Dtos.Subscription
{
    public class SubscriptionDto
    {
        public string Plan { get; set; } = "None";
        public string Status { get; set; } = "NeverSubscribed";
        public DateTime? StartedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int DaysLeft { get; set; }
        public bool HasUsedTrial { get; set; }
        public bool HasAccess { get; set; }
    }
}
