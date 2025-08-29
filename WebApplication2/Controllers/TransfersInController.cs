using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransfersInController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransfersInController(AppDbContext context)
        {
            _context = context;
        }

        // Get: api/transfersin/received
        [HttpGet("received")]
        public async Task<IActionResult> GetReceivedTransfers()
        {
            var role = HttpContext.Session.GetString("Role");
            var userIdStr = HttpContext.Session.GetString("Id");

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized("غير مسجل الدخول");

            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized("معرّف المستخدم غير صالح");

            var transfers = await _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.From)
                .Where(t =>
                    (t.ToUserId == userId || t.ToRole.ToLower() == role.ToLower()) &&
                    t.Status == TransferStatus.Sent
                )
                .OrderByDescending(t => t.DateSent)
                .Select(t => new
                {
                    t.TransferId,
                    t.DateSent,
                    t.Content,
                    Status = t.Status.ToString(),
                    From = (t.From.FirstName ?? "") + " " + (t.From.LastName ?? ""),
                    To = t.ToUserId != null ? t.To.FirstName + " " + t.To.LastName : t.ToRole,
                    Entity = t.Entity != null
                        ? new
                        {
                            t.Entity.EntityId,
                            t.Entity.EntityNumber,
                            t.Entity.Sujet,
                            t.Entity.Magistrale  // <-- added here
                        }
                        : null
                })
                .AsNoTracking()
                .ToListAsync();

            return Ok(transfers);
        }

        // POST: api/transfersin/{id}/accept
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptTransfer(int id)
        {
            var userIdStr = HttpContext.Session.GetString("Id");
            var role = HttpContext.Session.GetString("Role");

            if (string.IsNullOrEmpty(userIdStr) || string.IsNullOrEmpty(role))
                return Unauthorized("غير مسجل الدخول");

            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized("معرّف المستخدم غير صالح");

            var transfer = await _context.Transfers
                .Include(t => t.Entity)
                .FirstOrDefaultAsync(t => t.TransferId == id);

            if (transfer == null)
                return NotFound("Transfer not found");

            // ❌ Check if already accepted
            if (transfer.Status == TransferStatus.Accepted)
                return BadRequest("Transfer already accepted");

            // ✅ Role-based acceptance
            bool isAuthorized = false;

            if (transfer.ToUserId.HasValue)
            {
                // Only specific user can accept
                isAuthorized = transfer.ToUserId.Value == userId;
            }
            else if (!string.IsNullOrEmpty(transfer.ToRole))
            {
                // Any user in the role can accept if not yet assigned
                isAuthorized = true;
            }

            if (!isAuthorized)
                return Forbid("You are not authorized to accept this transfer");

            // Accept transfer
            transfer.Status = TransferStatus.Accepted;
            transfer.DateAccepted = DateTime.Now;

            // Fill ownership and ToUserId if not already
            if (!transfer.ToUserId.HasValue)
                transfer.ToUserId = userId;

            if (transfer.Entity != null)
                transfer.Entity.OwnerId = userId;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Transfer accepted" });
        }



        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectTransfer(int id)
        {
            var transfer = await _context.Transfers.FindAsync(id);
            if (transfer == null) return NotFound();

            transfer.Status = TransferStatus.Refused;
            transfer.DateAccepted = DateTime.Now;

            await _context.SaveChangesAsync(); // updates existing row
            return Ok(new { message = "Transfer refused" });
        }



        [HttpGet("completed")]
        public async Task<IActionResult> GetCompletedTransfers(int pageNumber = 1, int pageSize = 10)
        {
            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            var currentUser = await _context.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);

            if (currentUser == null)
                return Unauthorized(new { message = "User not found." });

            var transfersQuery = _context.Transfers
                .Where(t => t.Status == TransferStatus.Accepted)
                .Where(t => t.FromUserId == currentUser.Id || t.ToUserId == currentUser.Id || t.ToRole == currentUser.Role)
                .OrderByDescending(t => t.DateAccepted)
                .Select(t => new
                {
                    transferId = t.TransferId,
                    entityNumber = t.Entity.EntityNumber,
                    sujet = t.Entity.Sujet,
                    from = t.From.FirstName + " " + t.From.LastName,
                    to = t.To != null ? t.To.FirstName + " " + t.To.LastName : t.ToRole,
                    status = t.Status.ToString(),
                    dateSent = t.DateSent,
                    dateAccepted = t.DateAccepted
                })
                .Distinct();

            // Pagination
            var totalItems = await transfersQuery.CountAsync();
            var pagedTransfers = await transfersQuery
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                totalItems,
                pageNumber,
                pageSize,
                totalPages = (int)Math.Ceiling(totalItems / (double)pageSize),
                transfers = pagedTransfers
            });
        }


    }
}
