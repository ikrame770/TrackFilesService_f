using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;  // Database context

        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            // Only admin can fetch users
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized(new { message = "يمكنك فقط جلب قائمة المستخدمين إذا كنت مسؤولاً (admin)" });

            // Fetch all users with selected fields
            var users = await _db.Users
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.CNE,
                    Role = u.Role,
                    Username = u.FirstName + " " + u.LastName, // Convenience field
                })
                .ToListAsync();

            return Ok(new { users });
        }

        // DELETE: api/Users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            // Only admin can delete users
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized(new { message = "يمكنك فقط حذف المستخدمين إذا كنت مسؤولاً (admin)" });

            var user = await _db.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            try
            {
                // Delete related Entities owned by the user
                var userEntities = await _db.Entities.Where(e => e.OwnerId == id).ToListAsync();
                if (userEntities.Any())
                    _db.Entities.RemoveRange(userEntities);

                // Delete related Transfers (either sent or received)
                var userTransfers = await _db.Transfers
                    .Where(t => t.FromUserId == id || t.ToUserId == id)
                    .ToListAsync();
                if (userTransfers.Any())
                    _db.Transfers.RemoveRange(userTransfers);

                // Delete the user
                _db.Users.Remove(user);

                // Save all changes to database
                await _db.SaveChangesAsync();

                return Ok(new { message = "تم حذف الحساب وجميع البيانات المرتبطة به بنجاح" });
            }
            catch (Exception ex)
            {
                // Handle any exception that occurs during deletion
                return StatusCode(500, new { message = $"حدث خطأ أثناء الحذف: {ex.Message}" });
            }
        }
    }
}
