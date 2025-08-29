using Microsoft.AspNetCore.Mvc;
using WebApplication2.Data;
using WebApplication2.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UpdateUserController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IPasswordHasher<User> _hasher;

        public UpdateUserController(AppDbContext db, IPasswordHasher<User> hasher)
        {
            _db = db;
            _hasher = hasher;
        }

        [HttpPut]
        public async Task<IActionResult> Put([FromBody] UpdateUserRequest request)
        {
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized(new { message = "يمكنك فقط تحديث مستخدم إذا كنت مسؤولاً (admin)" });

            if (string.IsNullOrEmpty(request.Username))
                return BadRequest(new { message = "اسم المستخدم مطلوب" });

            var user = await _db.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == request.Username);

            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // Update password if provided
            if (!string.IsNullOrEmpty(request.NewPassword))
            {
                user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
            }

            // Update role / cho3ba if provided
            if (!string.IsNullOrEmpty(request.Role))
            {
                user.Role = request.Role;
            }

            try
            {
                _db.Users.Update(user);
                await _db.SaveChangesAsync();
                return Ok(new { message = "تم تحديث الحساب بنجاح", user });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"حدث خطأ أثناء التحديث: {ex.Message}" });
            }
        }
    }

    public class UpdateUserRequest
    {
        public string Username { get; set; } = null!;
        public string? NewPassword { get; set; }
        public string? Role { get; set; }
    }
}
