using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AddEntityController : ControllerBase
    {
        private readonly AppDbContext _context;

        // ✅ Constructor: inject database context
        public AddEntityController(AppDbContext context)
        {
            _context = context;
        }

        // ✅ POST: Add a new entity
        [HttpPost]
        public async Task<IActionResult> AddEntity([FromBody] AddEntityRequest request)
        {
            // ✅ Check user role and session
            var role = HttpContext.Session.GetString("Role");
            var userIdStr = HttpContext.Session.GetString("Id");

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized(new { message = "🚫 معرف المستخدم غير صالح." });

            // 👇 Restrict access to certain roles
            if (!(role.Equals("admin", StringComparison.OrdinalIgnoreCase) ||
                  role.Equals("مكتب ضبط", StringComparison.OrdinalIgnoreCase) ||
                  role.Equals("الصندوق", StringComparison.OrdinalIgnoreCase)))
            {
                return StatusCode(403, new { message = "🚫 غير مسموح لك بإضافة الملفات." });
            }

            // ✅ Validate request body
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // ✅ Verify that the user exists in database
            var creator = await _context.Users.FindAsync(userId);
            if (creator == null)
                return Unauthorized(new { message = "المستخدم غير موجود." });

            // ✅ Create new entity and set ownership
            var entity = new Entity
            {
                EntityNumber = request.EntityNumber,
                Part1 = request.Part1,
                Part2 = request.Part2,
                Sujet = request.Sujet,
                Status = request.Status,
                Magistrale = request.Magistrale,
                Type = request.Type,
                OwnerId = creator.Id,
                CreatedAt = DateTime.UtcNow
            };

            // ✅ Add entity to database and save changes
            _context.Entities.Add(entity);
            await _context.SaveChangesAsync();

            // ✅ Return success response with entity info
            return Ok(new
            {
                message = "✅ تم إضافة الملف وتسجيل الملكية بنجاح",
                entity = new
                {
                    entity.EntityId,
                    entity.EntityNumber,
                    entity.Part1,
                    entity.Part2,
                    entity.Sujet,
                    entity.Status,
                    entity.Magistrale,
                    entity.Type,
                    entity.OwnerId,
                    CreatedAt = entity.CreatedAt.ToString("yyyy-MM-dd")
                }
            });
        }
    }

    // ✅ Request model for adding a new entity
    public class AddEntityRequest
    {
        public string EntityNumber { get; set; }
        public string Part1 { get; set; }
        public string Part2 { get; set; }
        public string Sujet { get; set; }
        public string Status { get; set; }
        public string Magistrale { get; set; }
        public string Type { get; set; }
    }
}
