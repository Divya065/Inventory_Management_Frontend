using System.Security.Claims;

namespace Project_1.Extentions
{
    public static class ClaimsExtentions
    {
        public static string GetUsername(this ClaimsPrincipal user)
        {
            var claim = user?.Claims.SingleOrDefault(x => x.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname");

            return claim?.Value;
        }
    }
}
