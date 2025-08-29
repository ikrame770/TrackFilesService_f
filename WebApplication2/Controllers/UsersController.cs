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
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized(new { message = "يمكنك فقط جلب قائمة المستخدمين إذا كنت مسؤولاً (admin)" });

            var users = await _db.Users
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.CNE,
                    Role = u.Role,
                    Username = u.FirstName + " " + u.LastName,
                })
                .ToListAsync();

            return Ok(new { users });
        }

        // DELETE: api/Users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var currentRole = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(currentRole) || currentRole != "admin")
                return Unauthorized(new { message = "يمكنك فقط حذف المستخدمين إذا كنت مسؤولاً (admin)" });

            var user = await _db.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            try
            {
                // Delete related Entities
                var userEntities = await _db.Entities.Where(e => e.OwnerId == id).ToListAsync();
                if (userEntities.Any())
                    _db.Entities.RemoveRange(userEntities);

                // Delete related Transfers (From or To)
                var userTransfers = await _db.Transfers
                    .Where(t => t.FromUserId == id || t.ToUserId == id)
                    .ToListAsync();
                if (userTransfers.Any())
                    _db.Transfers.RemoveRange(userTransfers);

                // Delete the user
                _db.Users.Remove(user);

                await _db.SaveChangesAsync();

                return Ok(new { message = "تم حذف الحساب وجميع البيانات المرتبطة به بنجاح" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"حدث خطأ أثناء الحذف: {ex.Message}" });
            }
        }

    }
}
