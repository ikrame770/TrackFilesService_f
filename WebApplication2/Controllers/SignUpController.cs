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

        public SignUpController(AppDbContext db, IPasswordHasher<User> hasher)
        {
            _db = db;
            _hasher = hasher;
        }

        [HttpPost]
        public IActionResult Post([FromBody] User user)
        {
            // Read current role from session
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized("يمكنك فقط إنشاء مستخدم إذا كنت مسؤولاً (admin)");

            if (user == null)
                return BadRequest("User data is null");

            try
            {
                // Hash the plain password sent from frontend
                user.PasswordHash = _hasher.HashPassword(user, user.PasswordHash);

                _db.Users.Add(user);
                _db.SaveChanges();

                return Ok(new { message = "تم إنشاء الحساب بنجاح", user });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"حدث خطأ أثناء التسجيل: {ex.Message}" });
            }
        }
    }
}
