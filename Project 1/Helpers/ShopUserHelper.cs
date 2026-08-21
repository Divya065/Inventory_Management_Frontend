using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Project_1.Extentions;
using Project_1.Models;

namespace Project_1.Helpers
{
    public static class ShopUserHelper
    {
        public static async Task<(AppUser? User, IActionResult? Error)> GetActiveShopUserAsync(
            ControllerBase controller,
            UserManager<AppUser> userManager)
        {
            var username = controller.User.GetUsername();
            if (string.IsNullOrWhiteSpace(username))
                return (null, controller.Unauthorized(new { message = "User not authenticated." }));

            var user = await userManager.FindByNameAsync(username);
            if (user == null)
                return (null, controller.Unauthorized(new { message = "User not found." }));

            if (await userManager.IsInRoleAsync(user, "SuperAdmin"))
                return (null, controller.StatusCode(403, new { message = "Super Admin uses the platform panel, not shop operations." }));

            if (!user.IsActive)
                return (null, controller.StatusCode(403, new { message = "This shop account is suspended." }));

            if (!SubscriptionHelper.HasAccess(user))
                return (null, controller.StatusCode(403, new
                {
                    code = "subscription_required",
                    message = "Your subscription has ended. Open Subscription to continue."
                }));

            return (user, null);
        }
    }
}
