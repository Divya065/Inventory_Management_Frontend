using Project_1.Dtos.Subscription;
using Project_1.Models;

namespace Project_1.Helpers
{
    public static class SubscriptionHelper
    {
        public const string None = "None";
        public const string Trial = "Trial";
        public const string Monthly = "Monthly";
        public const string Yearly = "Yearly";

        public const string StatusActive = "Active";
        public const string StatusExpiringSoon = "ExpiringSoon";
        public const string StatusExpired = "Expired";
        public const string StatusNeverSubscribed = "NeverSubscribed";

        public static DateTime AddPlanPeriod(DateTime from, string plan) => plan switch
        {
            Trial => from.AddDays(14),
            Monthly => from.AddMonths(1),
            Yearly => from.AddYears(1),
            _ => from
        };

        public static bool IsPaidOrTrial(string? plan) =>
            plan is Trial or Monthly or Yearly;

        public static bool HasAccess(AppUser user)
        {
            if (user.PlanExpiresAt == null)
                return false;
            return user.PlanExpiresAt.Value > DateTime.UtcNow;
        }

        public static int DaysLeft(AppUser user)
        {
            if (user.PlanExpiresAt == null)
                return 0;
            var remaining = user.PlanExpiresAt.Value - DateTime.UtcNow;
            if (remaining.TotalSeconds <= 0)
                return 0;
            return Math.Max(1, (int)Math.Ceiling(remaining.TotalDays));
        }

        public static string Status(AppUser user)
        {
            if (HasAccess(user))
                return DaysLeft(user) <= 7 ? StatusExpiringSoon : StatusActive;

            if (!user.HasUsedTrial && (user.PlanExpiresAt == null || string.IsNullOrWhiteSpace(user.SubscriptionPlan) || user.SubscriptionPlan == None))
                return StatusNeverSubscribed;

            return StatusExpired;
        }

        public static SubscriptionDto ToDto(AppUser user)
        {
            var plan = string.IsNullOrWhiteSpace(user.SubscriptionPlan) ? None : user.SubscriptionPlan;
            return new SubscriptionDto
            {
                Plan = plan,
                Status = Status(user),
                StartedAt = user.PlanStartedAt,
                ExpiresAt = user.PlanExpiresAt,
                DaysLeft = DaysLeft(user),
                HasUsedTrial = user.HasUsedTrial,
                HasAccess = HasAccess(user)
            };
        }

        public static string? ApplyPlan(AppUser user, string plan, bool allowTrialReuse)
        {
            plan = (plan ?? "").Trim();
            if (plan is not (Trial or Monthly or Yearly))
                return "Plan must be Trial, Monthly, or Yearly.";

            if (plan == Trial && user.HasUsedTrial && !allowTrialReuse)
                return "Trial has already been used. Choose Monthly or Yearly.";

            var startFrom = DateTime.UtcNow;
            if (user.PlanExpiresAt.HasValue && user.PlanExpiresAt.Value > startFrom)
                startFrom = user.PlanExpiresAt.Value;

            user.SubscriptionPlan = plan;
            user.PlanStartedAt = DateTime.UtcNow;
            user.PlanExpiresAt = AddPlanPeriod(startFrom, plan);
            if (plan == Trial)
                user.HasUsedTrial = true;

            return null;
        }

        public static void StartTrial(AppUser user)
        {
            user.SubscriptionPlan = Trial;
            user.HasUsedTrial = true;
            user.PlanStartedAt = DateTime.UtcNow;
            user.PlanExpiresAt = AddPlanPeriod(DateTime.UtcNow, Trial);
        }
    }
}
