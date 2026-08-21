using Microsoft.AspNetCore.Identity;

namespace Project_1.Models
{
    public class AppUser : IdentityUser
    {
        /// <summary>Display name for this shop on the Super Admin panel.</summary>
        public string? ShopName { get; set; }

        /// <summary>When false, the shop cannot sign in (suspended by Super Admin).</summary>
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>None, Trial, Monthly, or Yearly.</summary>
        public string? SubscriptionPlan { get; set; }

        public DateTime? PlanStartedAt { get; set; }
        public DateTime? PlanExpiresAt { get; set; }
        public bool HasUsedTrial { get; set; }

        public List<CartItem> CartItems { get; set; } = new List<CartItem>();
        public List<Product> Products { get; set; } = new List<Product>();
    }
}
