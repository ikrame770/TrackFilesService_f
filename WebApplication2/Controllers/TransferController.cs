using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransfersController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Constructor: inject DB context
        public TransfersController(AppDbContext context)
        {
            _context = context;
        }

        // ----------------------------
        // GET: api/transfers/roles
        // Returns all distinct user roles in the system
        // ----------------------------
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Users
                .Where(u => !string.IsNullOrEmpty(u.Role))
                .Select(u => u.Role)
                .Distinct()
                .ToListAsync();

            return Ok(roles);
        }

        // ----------------------------
        // GET: api/transfers/users or api/transfers/users/{role}
        // Returns all users or filtered by role
        // ----------------------------
        [HttpGet("users")]
        [HttpGet("users/{role}")]
        public async Task<IActionResult> GetUsers(string? role = null)
        {
            var query = _context.Users.AsQueryable();
            if (!string.IsNullOrEmpty(role))
                query = query.Where(u => u.Role == role);

            var users = await query
                .Select(u => new { id = u.Id, fullName = u.FirstName + " " + u.LastName, role = u.Role })
                .ToListAsync();

            return Ok(users);
        }

        // ----------------------------
        // POST: api/transfers
        // Create a new transfer from current user to another user or role
        // ----------------------------
        [HttpPost]
        public async Task<IActionResult> CreateTransfer([FromBody] TransferRequest request)
        {
            // Validate session
            var username = HttpContext.Session.GetString("Username");
            var role = HttpContext.Session.GetString("Role");
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            if (string.IsNullOrEmpty(request.EntityNumber))
                return BadRequest(new { message = "رقم الملف مطلوب." });

            // Fetch the entity and current user
            var entity = await _context.Entities.FirstOrDefaultAsync(e => e.EntityNumber == request.EntityNumber);
            var fromUser = await _context.Users.FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);
            if (entity == null) return NotFound(new { message = "الملف غير موجود." });
            if (fromUser == null) return Unauthorized(new { message = "المستخدم غير موجود في الجلسة." });
            if (entity.OwnerId != fromUser.Id) return Unauthorized(new { message = "🚫 لا يمكنك إحالة ملف لا تملكه." });

            // Prepare transfers list to handle multiple recipients
            var transfersToAdd = new List<Transfer>();
            var addedUserIds = new HashSet<int>();

            // Add transfer to specific user
            if (request.ToUserId.HasValue)
            {
                transfersToAdd.Add(new Transfer
                {
                    EntityId = entity.EntityId,
                    FromUserId = fromUser.Id,
                    ToUserId = request.ToUserId.Value,
                    ToRole = request.ToRole ?? "",
                    Status = TransferStatus.Sent,
                    DateSent = DateTime.Now,
                    Content = request.Content ?? "تم إحالة الملف"
                });
                addedUserIds.Add(request.ToUserId.Value);
            }

            // Add transfer to all users of a specific role
            if (!string.IsNullOrEmpty(request.ToRole))
            {
                var roleUsers = await _context.Users.Where(u => u.Role == request.ToRole).ToListAsync();
                foreach (var user in roleUsers)
                {
                    if (addedUserIds.Contains(user.Id)) continue;
                    transfersToAdd.Add(new Transfer
                    {
                        EntityId = entity.EntityId,
                        FromUserId = fromUser.Id,
                        ToUserId = user.Id,
                        ToRole = request.ToRole,
                        Status = TransferStatus.Sent,
                        DateSent = DateTime.Now,
                        Content = request.Content ?? "تم إحالة الملف"
                    });
                    addedUserIds.Add(user.Id);
                }
            }

            if (!transfersToAdd.Any())
                return BadRequest(new { message = "اختر مستخدمًا أو جهة لإرسال الإحالة." });

            _context.Transfers.AddRange(transfersToAdd);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"✅ تم إنشاء {transfersToAdd.Count} إحالة بنجاح",
                transfers = transfersToAdd
            });
        }

        // ----------------------------
        // GET: api/transfers/mysent
        // Returns all transfers sent by current user, excluding accepted ones
        // ----------------------------
        [HttpGet("mysent")]
        public async Task<IActionResult> GetMySentTransfers()
        {
            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username)) return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            var fromUser = await _context.Users.FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);
            if (fromUser == null) return Unauthorized(new { message = "User not found in session." });

            var transfers = await _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.To)
                .Where(t => t.FromUserId == fromUser.Id && t.Status != TransferStatus.Accepted)
                .Select(t => new
                {
                    t.TransferId,
                    EntityNumber = t.Entity.EntityNumber,
                    t.ToUserId,
                    ToUserName = t.To.FirstName + " " + t.To.LastName,
                    t.ToRole,
                    t.Status,
                    t.Content,
                    t.DateSent
                })
                .ToListAsync();

            return Ok(transfers);
        }

        // ----------------------------
        // PUT: api/transfers/{id}
        // Update a specific transfer by sender
        // ----------------------------
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransfer(int id, [FromBody] TransferUpdateRequest updateRequest)
        {
            var transfer = await _context.Transfers
                .Include(t => t.Entity).Include(t => t.From).Include(t => t.To)
                .FirstOrDefaultAsync(t => t.TransferId == id);
            if (transfer == null) return NotFound(new { message = "Transfer not found" });

            var username = HttpContext.Session.GetString("Username");
            var fromUser = await _context.Users.FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);
            if (fromUser == null || fromUser.Id != transfer.FromUserId)
                return BadRequest(new { message = "ليس لديك صلاحية لتعديل هذه الإحالة." });

            if (transfer.Status == TransferStatus.Accepted)
                return BadRequest(new { message = "لا يمكن تعديل إحالة تم قبولها." });

            if (!string.IsNullOrEmpty(updateRequest.ToRole)) transfer.ToRole = updateRequest.ToRole;
            if (updateRequest.ToUserId.HasValue) transfer.ToUserId = updateRequest.ToUserId;
            if (!string.IsNullOrEmpty(updateRequest.Content)) transfer.Content = updateRequest.Content;

            transfer.Status = TransferStatus.Sent;
            transfer.DateSent = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new { message = "✅ تم تعديل الإحالة بنجاح", transfer });
        }

        // ----------------------------
        // DELETE: api/transfers/{id}
        // Cancel a transfer (only if sender and not accepted)
        // ----------------------------
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelTransfer(int id)
        {
            var transfer = await _context.Transfers.FindAsync(id);
            if (transfer == null) return NotFound(new { message = "Transfer not found." });

            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username)) return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            var fromUser = await _context.Users.FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);
            if (fromUser == null || fromUser.Id != transfer.FromUserId) return Forbid();

            if (transfer.Status == TransferStatus.Accepted)
                return BadRequest(new { message = "Cannot cancel an accepted transfer." });

            _context.Transfers.Remove(transfer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "✅ تم إلغاء الإحالة بنجاح" });
        }

        // ----------------------------
        // Other batch endpoints: CreateBatchTransferById, CancelBatch, AcceptBatch, RejectBatch, UpdateBatchTransfers
        // Logic: handle multiple transfers at once, validating session, ownership, and status
        // ----------------------------
    }

    // ----------------------------
    // DTOs for transfers and batch actions
    // ----------------------------
    public class BatchTransferRequest
    {
        public List<int> EntityIds { get; set; } = new List<int>();
        public int? ToUserId { get; set; }
        public string? ToRole { get; set; }
        public string? Content { get; set; }
    }

    public class TransferRequest
    {
        public string EntityNumber { get; set; }
        public int? ToUserId { get; set; }
        public string? ToRole { get; set; }
        public string? Content { get; set; }
    }

    public class TransferUpdateRequest
    {
        public int? ToUserId { get; set; }
        public string? ToRole { get; set; }
        public string? Content { get; set; }
    }

    public class CancelBatchRequest
    {
        public List<int> EntityIds { get; set; }
    }

    public class BatchActionRequest
    {
        public List<int> TransferIds { get; set; } = new List<int>();
    }

    public class BatchUpdateRequest
    {
        public List<int> TransferIds { get; set; } = new();
        public int? ToUserId { get; set; }
        public string? ToRole { get; set; }
        public string? Content { get; set; }
    }
}
