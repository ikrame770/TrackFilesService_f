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
        private readonly AppDbContext _db;           // Database context
        private readonly IPasswordHasher<User> _hasher; // Password hasher service

        public UpdateUserController(AppDbContext db, IPasswordHasher<User> hasher)
        {
            _db = db;
            _hasher = hasher;
        }

        // PUT: api/updateuser
        [HttpPut]
        public async Task<IActionResult> Put([FromBody] UpdateUserRequest request)
        {
            // Only admin can update users
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized(new { message = "يمكنك فقط تحديث مستخدم إذا كنت مسؤولاً (admin)" });

            // Username is required to identify which user to update
            if (string.IsNullOrEmpty(request.Username))
                return BadRequest(new { message = "اسم المستخدم مطلوب" });

            // Find the user by concatenated first and last name
            var user = await _db.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == request.Username);

            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // Update password if provided
            if (!string.IsNullOrEmpty(request.NewPassword))
            {
                // Hash the new password before storing it
                user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
            }

            // Update role if provided
            if (!string.IsNullOrEmpty(request.Role))
            {
                user.Role = request.Role;
            }

            try
            {
                // Mark entity as updated and save changes to database
                _db.Users.Update(user);
                await _db.SaveChangesAsync();

                return Ok(new { message = "تم تحديث الحساب بنجاح", user });
            }
            catch (Exception ex)
            {
                // Handle any error that occurs during the update
                return BadRequest(new { message = $"حدث خطأ أثناء التحديث: {ex.Message}" });
            }
        }
    }

    // DTO class for the update request
    public class UpdateUserRequest
    {
        public string Username { get; set; } = null!; // Required: username to update
        public string? NewPassword { get; set; }      // Optional: new password
        public string? Role { get; set; }             // Optional: new role
    }
}
