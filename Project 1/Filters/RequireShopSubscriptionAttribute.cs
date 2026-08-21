using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Project_1.Extentions;
using Project_1.Helpers;
using Project_1.Models;

namespace Project_1.Filters
{
    public class RequireShopSubscriptionAttribute : Attribute, IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<AppUser>>();
            var username = context.HttpContext.User.GetUsername();
            if (string.IsNullOrWhiteSpace(username))
            {
                context.Result = new UnauthorizedObjectResult(new { message = "User not authenticated." });
                return;
            }

            var user = await userManager.FindByNameAsync(username);
            if (user == null)
            {
                context.Result = new UnauthorizedObjectResult(new { message = "User not found." });
                return;
            }

            if (await userManager.IsInRoleAsync(user, "SuperAdmin"))
            {
                context.Result = new ObjectResult(new { message = "Super Admin uses the platform panel, not shop operations." })
                {
                    StatusCode = 403
                };
                return;
            }

            if (!user.IsActive)
            {
                context.Result = new ObjectResult(new { message = "This shop account is suspended." })
                {
                    StatusCode = 403
                };
                return;
            }

            if (!SubscriptionHelper.HasAccess(user))
            {
                context.Result = new ObjectResult(new
                {
                    code = "subscription_required",
                    message = "Your subscription has ended. Open Subscription to continue."
                })
                {
                    StatusCode = 403
                };
                return;
            }

            await next();
        }
    }
}
