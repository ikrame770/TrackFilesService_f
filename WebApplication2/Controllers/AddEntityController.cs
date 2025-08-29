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

        public AddEntityController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> AddEntity([FromBody] AddEntityRequest request)
        {
            // ✅ Check role and session
            var role = HttpContext.Session.GetString("Role");
            var userIdStr = HttpContext.Session.GetString("Id");

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized(new { message = "🚫 معرف المستخدم غير صالح." });

            // 👇 Restrict who can create files
            if (!(role.Equals("admin", StringComparison.OrdinalIgnoreCase) ||
                  role.Equals("مكتب ضبط", StringComparison.OrdinalIgnoreCase) ||
                  role.Equals("الصندوق", StringComparison.OrdinalIgnoreCase)))
            {
                return StatusCode(403, new { message = "🚫 غير مسموح لك بإضافة الملفات." });
            }

            // ✅ Validate request
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // ✅ Find user by ID
            var creator = await _context.Users.FindAsync(userId);
            if (creator == null)
                return Unauthorized(new { message = "المستخدم غير موجود." });

            // ✅ Create entity with ownership
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


            _context.Entities.Add(entity);
            await _context.SaveChangesAsync();

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
