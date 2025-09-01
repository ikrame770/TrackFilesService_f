using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Models;
using WebApplication2.Data;
using Microsoft.AspNetCore.Identity;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SignInController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPasswordHasher<User> _hasher;

        // Constructor: inject DB context and password hasher
        public SignInController(AppDbContext db, IPasswordHasher<User> hasher)
        {
            _db = db;
            _hasher = hasher;
        }

        // ----------------------------
        // POST: api/signin
        // Handles user login
        // ----------------------------
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] SignInRequest request)
        {
            // Validate request body
            if (request == null || string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                return BadRequest("البيانات غير صحيحة");

            // Find user by full name
            var user = await _db.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == request.Username);

            if (user == null)
                return Unauthorized("اسم المستخدم غير موجود");

            // Verify password
            var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
                return Unauthorized("كلمة المرور غير صحيحة");

            // Store user info in session for subsequent requests
            HttpContext.Session.SetString("Id", user.Id.ToString());
            HttpContext.Session.SetString("Username", user.FirstName + " " + user.LastName);
            HttpContext.Session.SetString("CNE", user.CNE ?? "");
            HttpContext.Session.SetString("Role", user.Role ?? "");

            // Return user info and success message
            return Ok(new
            {
                message = "تم تسجيل الدخول بنجاح",
                id = user.Id,
                username = user.FirstName + " " + user.LastName,
                cne = user.CNE,
                role = user.Role
            });
        }
    }

    // ----------------------------
    // DTO for login request
    // ----------------------------
    public class SignInRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }
}
