using Microsoft.AspNetCore.Mvc;
using WebApplication2.Models;
using WebApplication2.Data;
using Microsoft.AspNetCore.Identity;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SignUpController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPasswordHasher<User> _hasher;

        // Constructor: inject DB context and password hasher
        public SignUpController(AppDbContext db, IPasswordHasher<User> hasher)
        {
            _db = db;
            _hasher = hasher;
        }

        // ----------------------------
        // POST: api/signup
        // Handles user registration (admin-only)
        // ----------------------------
        [HttpPost]
        public IActionResult Post([FromBody] User user)
        {
            // Check if current user in session is admin
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized("يمكنك فقط إنشاء مستخدم إذا كنت مسؤولاً (admin)");

            // Validate request body
            if (user == null)
                return BadRequest("User data is null");

            try
            {
                // Hash the plain password before storing
                user.PasswordHash = _hasher.HashPassword(user, user.PasswordHash);

                // Add new user to DB and save
                _db.Users.Add(user);
                _db.SaveChanges();

                return Ok(new { message = "تم إنشاء الحساب بنجاح", user });
            }
            catch (Exception ex)
            {
                // Return error message if something fails
                return BadRequest(new { message = $"حدث خطأ أثناء التسجيل: {ex.Message}" });
            }
        }
    }
}
