using Project_1.Models;

namespace Project_1.Interface
{
    public interface ITokenService
    {
        string CreateToken(AppUser user, IEnumerable<string>? roles = null);
    }
}
