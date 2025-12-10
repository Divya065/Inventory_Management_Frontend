using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project_1.Data;
using Project_1.Dtos.Account;
using Project_1.Interface;
using Project_1.Models;
using Project_1.Service;
using System.Runtime.CompilerServices;

namespace Project_1.Controllers
{
    [Route("api/account")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly ITokenService _tokenService;
        private readonly SignInManager<AppUser> _signInManager;
        private readonly ApplicationDBContext _context;

        public AccountController(UserManager<AppUser> userManager ,ITokenService tokenService ,SignInManager<AppUser> signInManager, ApplicationDBContext context)
        {
            _userManager = userManager;
            _tokenService = tokenService;
            _signInManager = signInManager;
            _context = context;
        }

        //This piece of code is reponsible for login
        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { message = "Invalid request data", errors = ModelState });

                var user = await _userManager.Users.FirstOrDefaultAsync(s => s.UserName == loginDto.UserName.ToLower());
                if (user == null)
                    return Unauthorized(new { message = "Invalid username or password" });

                var result = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, false);

                if (!result.Succeeded)
                    return Unauthorized(new { message = "Invalid username or password" });

                // Create token
                var token = _tokenService.CreateToken(user);
                
                // Verify token was created
                if (string.IsNullOrEmpty(token))
                {
                    return StatusCode(500, new { message = "Failed to generate authentication token" });
                }

                return Ok(
                    new NewUserDto
                    {
                        UserName = user.UserName,
                        Email = user.Email,
                        Token = token
                    }
                );
            }
            catch (Exception e)
            {
                // Log the full exception for debugging
                Console.WriteLine($"❌ Login Error: {e.Message}");
                Console.WriteLine($"Stack Trace: {e.StackTrace}");
                if (e.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {e.InnerException.Message}");
                    Console.WriteLine($"Inner Stack Trace: {e.InnerException.StackTrace}");
                }
                
                // Return a simple, serializable error response
                var errorMessage = e.Message;
                if (e.InnerException != null)
                {
                    errorMessage += $" | Inner: {e.InnerException.Message}";
                }
                
                return StatusCode(500, new { 
                    message = "An error occurred during login", 
                    error = errorMessage
                });
            }
        }

        [HttpPost("register")]

        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            try
            {
                if(!ModelState.IsValid)
                    return BadRequest(new { message = "Invalid request data", errors = ModelState });

                // Check if username already exists
                var existingUser = await _userManager.FindByNameAsync(registerDto.Username);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Username already exists" });
                }

                // Check if email already exists
                var existingEmail = await _userManager.FindByEmailAsync(registerDto.Email);
                if (existingEmail != null)
                {
                    return BadRequest(new { message = "Email already registered" });
                }

                // Create new user
                var appUser = new AppUser
                {
                    UserName = registerDto.Username,
                    Email = registerDto.Email,
                };

                // Create user - this automatically saves to database
                var createdUser = await _userManager.CreateAsync(appUser, registerDto.Password);

                if (createdUser.Succeeded)
                {
                    // Verify user was saved to database
                    var savedUser = await _userManager.FindByNameAsync(registerDto.Username);
                    if (savedUser == null)
                    {
                        return StatusCode(500, new { message = "User was created but could not be verified in database" });
                    }

                    // Assign "User" role - this also saves to database
                    var roleResult = await _userManager.AddToRoleAsync(appUser, "User");
                    if (roleResult.Succeeded) 
                    {
                        // Explicitly save changes to ensure everything is persisted
                        await _context.SaveChangesAsync();

                        // Verify the user exists in database one more time
                        var verifiedUser = await _userManager.FindByIdAsync(savedUser.Id);
                        if (verifiedUser == null)
                        {
                            return StatusCode(500, new { message = "User registration completed but verification failed" });
                        }

                        return Ok(
                            new NewUserDto
                            {
                                UserName = verifiedUser.UserName,
                                Email = verifiedUser.Email,
                                Token = _tokenService.CreateToken(verifiedUser)
                            }
                        );
                    }
                    else
                    {
                        // If role assignment fails, delete the user and return error
                        await _userManager.DeleteAsync(appUser);
                        await _context.SaveChangesAsync();
                        var roleErrors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                        return BadRequest(new { message = $"Failed to assign role: {roleErrors}" });
                    }
                }
                else
                {
                    // Return validation errors in a user-friendly format
                    var errors = createdUser.Errors.Select(e => e.Description).ToList();
                    return BadRequest(new { message = "Registration failed", errors = errors });
                }
            }
            catch(Exception e)
            {
                return StatusCode(500, new { message = "An error occurred during registration", error = e.Message, stackTrace = e.StackTrace });
            }
        }
    }
}
