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

        // ✅ Constructor: inject the database context
        public EntityController(AppDbContext context)
        {
            _context = context;
        }

        // ----------------------------
        // GET: api/entity/owned
        // Returns all entities owned by the logged-in user
        // ----------------------------
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
                .OrderByDescending(e => e.CreatedAt)
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

        // ----------------------------
        // GET: api/files/reunion
        // Returns all files related to the logged-in user, including:
        // - Owned files not sent
        // - Files sent by user and pending
        // - Files received and pending
        // ----------------------------
        [HttpGet("reunion")]
        public async Task<IActionResult> GetAllUserFiles()
        {
            var userIdStr = HttpContext.Session.GetString("Id");
            var role = HttpContext.Session.GetString("Role");

            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            if (string.IsNullOrEmpty(role))
                return Unauthorized(new { message = "🚫 بيانات الدور غير موجود." });

            // Get owned files that have not been sent yet
            var owned = await _context.Entities
                .Where(e => e.OwnerId == userId
                    && !_context.Transfers.Any(t =>
                        t.EntityId == e.EntityId &&
                        t.Status == TransferStatus.Sent))
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

            // Get files sent by the user and still pending
            var sent = await _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.To)
                .Where(t => t.FromUserId == userId && t.Status == TransferStatus.Sent)
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

            // Get files received by the user that are pending
            var received = await _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.From)
                .Where(t =>
                    (t.ToUserId == userId || t.ToRole.ToLower() == role.ToLower()) &&
                    t.Status == TransferStatus.Sent)
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

            // Combine all files and sort by date
            var allFiles = owned
                .Concat(sent)
                .Concat(received)
                .OrderByDescending(f => f.Date)
                .ToList();

            return Ok(allFiles);
        }

        // ----------------------------
        // GET: api/entity/my-entities
        // Returns all entity numbers owned by the user and available for sending
        // ----------------------------
        [HttpGet("my-entities")]
        public async Task<IActionResult> GetMyEntities()
        {
            var userIdString = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized(new { message = "غير مسموح" });

            if (!int.TryParse(userIdString, out int userId))
                return Unauthorized(new { message = "غير مسموح" });

            var ownedEntities = _context.Entities
                .Where(e => e.OwnerId == userId);

            var sentEntityNumbers = await _context.Transfers
                .Where(t => t.FromUserId == userId && t.Status == TransferStatus.Sent)
                .Select(t => t.Entity.EntityNumber)
                .ToListAsync();

            var availableEntities = await ownedEntities
                .Where(e => !sentEntityNumbers.Contains(e.EntityNumber))
                .Select(e => e.EntityNumber)
                .ToListAsync();

            return Ok(availableEntities);
        }

        // ----------------------------
        // GET: api/entity/check?fileNumber=...
        // Checks if the current user can transfer a specific file
        // Returns true if owned and not already sent
        // ----------------------------
        [HttpGet("check")]
        public async Task<IActionResult> CheckOwnership([FromQuery] string fileNumber)
        {
            var userIdString = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized(new { message = "غير مسموح" });

            if (!int.TryParse(userIdString, out int userId))
                return Unauthorized(new { message = "غير مسموح" });

            int currentUserId = userId;

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

    // ----------------------------
    // File DTO: Used to unify entity/transfer data for API responses
    // ----------------------------
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
