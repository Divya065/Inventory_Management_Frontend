using Microsoft.IdentityModel.Tokens;
using Project_1.Interface;
using Project_1.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Project_1.Service
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;
        private readonly SymmetricSecurityKey _key;
        public TokenService(IConfiguration config)
        {
            _config = config;
            var signingKey = _config["Jwt:SigningKey"];
            
            if (string.IsNullOrEmpty(signingKey))
            {
                throw new InvalidOperationException("JWT SigningKey is not configured in appsettings.json");
            }
            
            _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        }
        public string CreateToken(AppUser user)
        {
            try
            {
                if (user == null)
                    throw new ArgumentNullException(nameof(user));
                
                // Allow null email but log warning
                if (string.IsNullOrEmpty(user.Email))
                {
                    Console.WriteLine($"⚠️ Warning: User {user.UserName} has no email address");
                }
                
                if (string.IsNullOrEmpty(user.UserName))
                    throw new ArgumentException("User name is required for token creation", nameof(user));

                var claims = new List<Claim>
                {
                    new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                    new Claim(JwtRegisteredClaimNames.GivenName, user.UserName ?? string.Empty)
                };

                var issuer = _config["Jwt:Issuer"];
                var audience = _config["Jwt:Audience"];
                
                if (string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
                {
                    throw new InvalidOperationException("JWT Issuer or Audience is not configured in appsettings.json");
                }

                var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);

                var tokenDescreptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(claims),
                    Expires = DateTime.Now.AddDays(7),
                    SigningCredentials = creds,
                    Issuer = issuer,
                    Audience = audience
                };

                var tokenhandler = new JwtSecurityTokenHandler();
                var token = tokenhandler.CreateToken(tokenDescreptor);

                return tokenhandler.WriteToken(token);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Token creation failed: {ex.Message}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                throw;
            }
        }
    }
}
