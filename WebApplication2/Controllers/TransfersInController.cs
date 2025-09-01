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

        // Get all transfers received by the current user or their role
        [HttpGet("received")]
        public async Task<IActionResult> GetReceivedTransfers()
        {
            // Get role and userId from session
            var role = HttpContext.Session.GetString("Role");
            var userIdStr = HttpContext.Session.GetString("Id");

            // Unauthorized if not logged in
            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized("غير مسجل الدخول");

            // Ensure userId is a valid integer
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized("معرّف المستخدم غير صالح");

            // Query transfers assigned to user or role, status = Sent
            var transfers = await _context.Transfers
                .Include(t => t.Entity) // include related entity
                .Include(t => t.From)   // include sender info
                .Where(t =>
                    (t.ToUserId == userId || t.ToRole.ToLower() == role.ToLower()) &&
                    t.Status == TransferStatus.Sent
                )
                .OrderByDescending(t => t.DateSent) // newest first
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
                            t.Entity.Magistrale  // included for display
                        }
                        : null
                })
                .AsNoTracking() // read-only improves performance
                .ToListAsync();

            return Ok(transfers);
        }

        // Accept a specific transfer
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptTransfer(int id)
        {
            // Get session info
            var userIdStr = HttpContext.Session.GetString("Id");
            var role = HttpContext.Session.GetString("Role");

            if (string.IsNullOrEmpty(userIdStr) || string.IsNullOrEmpty(role))
                return Unauthorized("غير مسجل الدخول");

            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized("معرّف المستخدم غير صالح");

            // Get the transfer including related entity
            var transfer = await _context.Transfers
                .Include(t => t.Entity)
                .FirstOrDefaultAsync(t => t.TransferId == id);

            if (transfer == null)
                return NotFound("Transfer not found");

            // Check if already accepted
            if (transfer.Status == TransferStatus.Accepted)
                return BadRequest("Transfer already accepted");

            // Role-based authorization
            bool isAuthorized = false;
            if (transfer.ToUserId.HasValue)
            {
                // Only the assigned user can accept
                isAuthorized = transfer.ToUserId.Value == userId;
            }
            else if (!string.IsNullOrEmpty(transfer.ToRole))
            {
                // Any member of the role can accept
                isAuthorized = true;
            }

            if (!isAuthorized)
                return Forbid("You are not authorized to accept this transfer");

            // Accept the transfer
            transfer.Status = TransferStatus.Accepted;
            transfer.DateAccepted = DateTime.Now;

            // Assign ownership if not already set
            if (!transfer.ToUserId.HasValue)
                transfer.ToUserId = userId;

            if (transfer.Entity != null)
                transfer.Entity.OwnerId = userId;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Transfer accepted" });
        }

        // Reject a specific transfer
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectTransfer(int id)
        {
            var transfer = await _context.Transfers.FindAsync(id);
            if (transfer == null) return NotFound();

            // Mark as refused
            transfer.Status = TransferStatus.Refused;
            transfer.DateAccepted = DateTime.Now;

            await _context.SaveChangesAsync(); // update DB
            return Ok(new { message = "Transfer refused" });
        }

        // Get completed (accepted) transfers for the current user
        [HttpGet("completed")]
        public async Task<IActionResult> GetCompletedTransfers(int pageNumber = 1, int pageSize = 20)
        {
            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            var currentUser = await _context.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);

            if (currentUser == null)
                return Unauthorized(new { message = "User not found." });

            // Query accepted transfers related to current user
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
                .Distinct(); // remove duplicates

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
