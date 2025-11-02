using Project_1.Models;

namespace Project_1.Interface
{
    public interface ITokenService
    {
        String CreateToken(AppUser user);
    }
}
