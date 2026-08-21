using Project_1.Dtos.Subscription;

namespace Project_1.Dtos.Account
{
    public class NewUserDto
    {
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Token { get; set; }
        public List<string> Roles { get; set; } = new();
        public SubscriptionDto Subscription { get; set; } = new();
    }
}
