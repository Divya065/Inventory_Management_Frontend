using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Dtos.Subscription;
using Project_1.Dtos.SuperAdmin;
using Project_1.Helpers;

namespace Project_1.Controllers
{
    [Route("api/superadmin")]
    [ApiController]
    [Authorize(Roles = "SuperAdmin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly UserManager<Models.AppUser> _userManager;
        private readonly ApplicationDBContext _db;

        public SuperAdminController(UserManager<Models.AppUser> userManager, ApplicationDBContext db)
        {
            _userManager = userManager;
            _db = db;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> Overview()
        {
            var shopUsers = await GetShopUsersQuery().ToListAsync();
            var dto = new PlatformOverviewDto
            {
                ShopCount = shopUsers.Count,
                ActivePlans = shopUsers.Count(u => u.IsActive && SubscriptionHelper.Status(u) == SubscriptionHelper.StatusActive),
                ExpiringSoon = shopUsers.Count(u => u.IsActive && SubscriptionHelper.Status(u) == SubscriptionHelper.StatusExpiringSoon),
                Expired = shopUsers.Count(u => u.IsActive && !SubscriptionHelper.HasAccess(u)),
                SuspendedShopCount = shopUsers.Count(u => !u.IsActive)
            };

            return Ok(dto);
        }

        [HttpGet("shops")]
        public async Task<IActionResult> GetShops()
        {
            var shops = await GetShopUsersQuery()
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            var list = shops.Select(u =>
            {
                var sub = SubscriptionHelper.ToDto(u);
                return new ShopAccountDto
                {
                    Id = u.Id,
                    UserName = u.UserName ?? "",
                    Email = u.Email ?? "",
                    ShopName = string.IsNullOrWhiteSpace(u.ShopName) ? u.UserName : u.ShopName,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    Plan = sub.Plan,
                    PlanStatus = sub.Status,
                    DaysLeft = sub.DaysLeft,
                    PlanExpiresAt = sub.ExpiresAt,
                    HasUsedTrial = sub.HasUsedTrial
                };
            }).ToList();

            return Ok(list);
        }

        [HttpPost("shops/{id}/suspend")]
        public async Task<IActionResult> Suspend(string id)
        {
            return await SetActiveAsync(id, false);
        }

        [HttpPost("shops/{id}/activate")]
        public async Task<IActionResult> Activate(string id)
        {
            return await SetActiveAsync(id, true);
        }

        [HttpPost("shops/{id}/assign-plan")]
        public async Task<IActionResult> AssignPlan(string id, [FromBody] ChoosePlanDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "Shop not found." });

            if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
                return BadRequest(new { message = "Cannot assign a shop plan to Super Admin." });

            var error = SubscriptionHelper.ApplyPlan(user, dto.Plan, allowTrialReuse: false);
            if (error != null)
                return BadRequest(new { message = error });

            await _userManager.UpdateAsync(user);
            return Ok(SubscriptionHelper.ToDto(user));
        }

        private IQueryable<Models.AppUser> GetShopUsersQuery()
        {
            var superAdminIds = _db.UserRoles
                .Join(_db.Roles.Where(r => r.NormalizedName == "SUPERADMIN"),
                    ur => ur.RoleId,
                    r => r.Id,
                    (ur, r) => ur.UserId);

            return _userManager.Users.Where(u => !superAdminIds.Contains(u.Id));
        }

        private async Task<IActionResult> SetActiveAsync(string id, bool isActive)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "Shop not found." });

            if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
                return BadRequest(new { message = "Cannot change Super Admin status here." });

            user.IsActive = isActive;
            await _userManager.UpdateAsync(user);
            return Ok(new
            {
                id = user.Id,
                isActive = user.IsActive,
                message = isActive ? "Shop activated." : "Shop suspended."
            });
        }
    }
}
