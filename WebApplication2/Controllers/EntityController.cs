using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EntityController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EntityController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/entity/owned
        [HttpGet("owned")]
        public async Task<IActionResult> GetOwnedEntities()
        {
            var userIdStr = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            if (!int.TryParse(userIdStr, out int userId) || userId <= 0)
                return BadRequest(new { message = "❌ معرّف المستخدم غير صالح." });

            var entities = await _context.Entities
                .Where(e => e.OwnerId == userId)
                .OrderByDescending(e => e.CreatedAt) // sort by creation date
                .Select(e => new
                {
                    e.EntityId,
                    e.EntityNumber,
                    e.Sujet,
                    e.Part1,
                    e.Part2,
                    e.Status,
                    e.Magistrale,
                    e.Type,
                    e.CreatedAt
                })
                .ToListAsync();

            return Ok(new { files = entities });
        }

        // GET: api/files/reunion
        [HttpGet("reunion")]
        public async Task<IActionResult> GetAllUserFiles()
        {
            var userIdStr = HttpContext.Session.GetString("Id");
            var role = HttpContext.Session.GetString("Role");

            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            if (string.IsNullOrEmpty(role))
                return Unauthorized(new { message = "🚫 بيانات الدور غير موجود." });

            // 🔹 Unified DTO
            var owned = await _context.Entities
                .Where(e => e.OwnerId == userId
                    && !_context.Transfers.Any(t =>
                        t.EntityId == e.EntityId &&
                        t.Status == TransferStatus.Sent)) // only block if already Sent
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new FileDto
                {
                    Id = e.EntityId,
                    Number = e.EntityNumber,
                    Sujet = e.Sujet,
                    Part1 = e.Part1,
                    Part2 = e.Part2,
                    Status = e.Status,
                    Magistrale = e.Magistrale,
                    Type = e.Type,
                    Date = e.CreatedAt,
                    Source = "Owned",
                    FromOrTo = null
                })
                .ToListAsync();



            var sent = await _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.To)
                .Where(t => t.FromUserId == userId && t.Status == TransferStatus.Sent) // only pending
                .Select(t => new FileDto
                {
                    Id = t.TransferId,
                    Number = t.Entity.EntityNumber,
                    Sujet = t.Entity.Sujet,
                    Part1 = t.Entity.Part1,
                    Part2 = t.Entity.Part2,
                    Status = t.Status.ToString(),
                    Magistrale = t.Entity.Magistrale,
                    Type = t.Entity.Type,
                    Date = t.DateSent,
                    Source = "Sent",
                    FromOrTo = t.ToUserId != null
                        ? t.To.FirstName + " " + t.To.LastName
                        : t.ToRole
                })
                .ToListAsync();



            var received = await _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.From)
                .Where(t =>
                    (t.ToUserId == userId || t.ToRole.ToLower() == role.ToLower()) &&
                    t.Status == TransferStatus.Sent   // <-- only pending
                )
                .Select(t => new FileDto
                {
                    Id = t.TransferId,
                    Number = t.Entity.EntityNumber,
                    Sujet = t.Entity.Sujet,
                    Part1 = t.Entity.Part1,
                    Part2 = t.Entity.Part2,
                    Status = t.Status.ToString(),
                    Magistrale = t.Entity.Magistrale,
                    Type = t.Entity.Type,
                    Date = t.DateSent,
                    Source = "Received",
                    FromOrTo = t.From.FirstName + " " + t.From.LastName
                })
                .ToListAsync();

            var allFiles = owned
                .Concat(sent)
                .Concat(received)
                .OrderByDescending(f => f.Date)
                .ToList();

            return Ok(allFiles);
        }

        [HttpGet("my-entities")]
        public async Task<IActionResult> GetMyEntities()
        {
            var userIdString = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized(new { message = "غير مسموح" });

            if (!int.TryParse(userIdString, out int userId))
                return Unauthorized(new { message = "غير مسموح" });

            // Get all entities owned by the user
            var ownedEntities = _context.Entities
                .Where(e => e.OwnerId == userId);

            // Get entities that have a transfer with status Sent
            var sentEntityNumbers = await _context.Transfers
                .Where(t => t.FromUserId == userId && t.Status == TransferStatus.Sent)
                .Select(t => t.Entity.EntityNumber)
                .ToListAsync();

            // Exclude sent entities
            var availableEntities = await ownedEntities
                .Where(e => !sentEntityNumbers.Contains(e.EntityNumber))
                .Select(e => e.EntityNumber)
                .ToListAsync();

            return Ok(availableEntities);
        }


        // GET: api/entity/check?fileNumber=...
        [HttpGet("check")]
        public async Task<IActionResult> CheckOwnership([FromQuery] string fileNumber)
        {
            var userIdString = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized(new { message = "غير مسموح" });

            if (!int.TryParse(userIdString, out int userId))
                return Unauthorized(new { message = "غير مسموح" });


            int currentUserId = userId; // get the current logged-in user ID

            // Query: entity exists, is owned by user, and has no Sent transfer
            var result = await _context.Entities
                .Where(e => e.EntityNumber == fileNumber && e.OwnerId == currentUserId)
                .Select(e => new 
                {
                    CanTransfer = !_context.Transfers
                        .Any(t => t.EntityId == e.EntityId && t.Status == TransferStatus.Sent),
                    EntityExists = true
                })
                .FirstOrDefaultAsync();

            if (result == null)
            {
                return Ok(new { canTransfer = false, reason = "not-owned-or-missing" });
            }

            return Ok(result.CanTransfer 
                ? new { canTransfer = true, reason = "ok" } 
                : new { canTransfer = false, reason = "already-sent" });
        }
                
    }
    public class FileDto
        {
            public int Id { get; set; }
            public string Number { get; set; } = "";
            public string Sujet { get; set; } = "";
            public string Part1 { get; set; } = "";
            public string Part2 { get; set; } = "";
            public string Status { get; set; } = "";
            public string Magistrale { get; set; } = "";
            public string Type { get; set; } = "";
            public DateTime Date { get; set; }
            public string? FromOrTo { get; set; }
            public string Source { get; set; } = "";
     }
}
