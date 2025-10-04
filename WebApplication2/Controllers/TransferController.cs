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

        [HttpGet("completedfiles")]
        public async Task<IActionResult> GetCompletedFiles([FromQuery] string fileNumber)
        {
            if (string.IsNullOrEmpty(fileNumber))
                return BadRequest(new { message = "🚫 يجب إدخال رقم الملف." });

            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            var currentUser = await _context.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);

            if (currentUser == null)
                return Unauthorized(new { message = "User not found." });

            // Fetch transfers related to the file number
            var transfersQuery = _context.Transfers
                .Include(t => t.Entity)
                .Include(t => t.From)
                .Include(t => t.To)
                .Where(t => t.Entity.EntityNumber.Contains(fileNumber)) // filter by file number
                .OrderByDescending(t => t.DateAccepted)
                .Select(t => new
                {
                    transferId = t.TransferId,
                    entityNumber = t.Entity.EntityNumber,
                    sujet = t.Entity.Sujet,
                    content = t.Entity.Part1 + " " + t.Entity.Part2, // combine parts
                    from = t.From.FirstName + " " + t.From.LastName,
                    to = t.To != null ? t.To.FirstName + " " + t.To.LastName : t.ToRole,
                    status = t.Status.ToString(),
                    dateSent = t.DateSent,
                    dateAccepted = t.DateAccepted
                });

            var result = await transfersQuery.ToListAsync();

            if (result.Count == 0)
                return Ok(new List<object>()); // return empty array if none found

            return Ok(result);
        }

        // ----------------------------
        // Other batch endpoints: CreateBatchTransferById, CancelBatch, AcceptBatch, RejectBatch, UpdateBatchTransfers
        // Logic: handle multiple transfers at once, validating session, ownership, and status
        // ----------------------------

        [HttpPost("batch-by-id")]
        public async Task<IActionResult> CreateBatchTransferById([FromBody] BatchTransferRequest request)
        {
            var username = HttpContext.Session.GetString("Username");
            var role = HttpContext.Session.GetString("Role");

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
                return Unauthorized(new { message = "🚫 يجب تسجيل الدخول أولاً." });

            var fromUser = await _context.Users
                .FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);

            if (fromUser == null)
                return Unauthorized(new { message = "المستخدم غير موجود في الجلسة." });

            var transfersToAdd = new List<Transfer>();
            var addedUserIds = new HashSet<int>();

            foreach (var entityId in request.EntityIds)
            {
                var entity = await _context.Entities.FirstOrDefaultAsync(e => e.EntityId == entityId);
                if (entity == null) continue;
                if (entity.OwnerId != fromUser.Id) continue;

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

                if (!string.IsNullOrEmpty(request.ToRole))
                {
                    var roleUsers = await _context.Users
                        .Where(u => u.Role == request.ToRole)
                        .ToListAsync();

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
            }

            if (!transfersToAdd.Any())
                return BadRequest(new { message = "🚫 لم يتم إنشاء أي إحالات" });

            _context.Transfers.AddRange(transfersToAdd);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"✅ تم إنشاء {transfersToAdd.Count} إحالة بنجاح",
                transfers = transfersToAdd
            });
        }

        [HttpPost("cancel-batch")]
        public async Task<IActionResult> CancelbatchTransfers([FromBody] List<int> transferIds)
        {
            if (transferIds == null || transferIds.Count == 0)
                return BadRequest("No transfers selected.");

            var transfers = await _context.Transfers
                .Where(t => transferIds.Contains(t.TransferId) && t.Status == TransferStatus.Sent)
                .ToListAsync();

            if (transfers.Count == 0)
                return NotFound("No valid transfers found to cancel.");

            _context.Transfers.RemoveRange(transfers);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Selected transfers cancelled (deleted) successfully." });
        }

        [HttpPost("accept-batch")]
        public async Task<IActionResult> AcceptBatch([FromBody] List<int> transferIds)
        {
            var userIdStr = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized("غير مسجل الدخول");

            if (transferIds == null || !transferIds.Any())
                return BadRequest("لم يتم تقديم أي تحويلات");

            var transfers = await _context.Transfers
                .Include(t => t.Entity)
                .Where(t => transferIds.Contains(t.TransferId))
                .ToListAsync();

            if (!transfers.Any())
                return NotFound("No matching transfers found");

            int acceptedCount = 0;
            var errors = new List<string>();

            foreach (var transfer in transfers)
            {
                // Skip already accepted
                if (transfer.Status == TransferStatus.Accepted)
                {
                    errors.Add($"Transfer {transfer.TransferId} already accepted");
                    continue;
                }

                // Only allow accepting transfers sent to this user or role-wide
                bool isReceived = transfer.ToUserId.HasValue && transfer.ToUserId.Value == userId;
                bool isRoleWide = string.IsNullOrEmpty(transfer.ToUserId?.ToString()) && !string.IsNullOrEmpty(transfer.ToRole);

                if (!isReceived && !isRoleWide)
                {
                    errors.Add($"Not authorized to accept transfer {transfer.TransferId}");
                    continue;
                }

                // Accept transfer
                transfer.Status = TransferStatus.Accepted;
                transfer.DateAccepted = DateTime.Now;

                if (!transfer.ToUserId.HasValue)
                    transfer.ToUserId = userId;

                if (transfer.Entity != null)
                    transfer.Entity.OwnerId = userId;

                acceptedCount++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"✅ تم قبول {acceptedCount} إحالة بنجاح",
                errors
            });
        }


        [HttpPost("reject-batch")]
        public async Task<IActionResult> RejectBatch([FromBody] List<int> transferIds)
        {
            var userIdStr = HttpContext.Session.GetString("Id");
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized("غير مسجل الدخول");

            if (transferIds == null || !transferIds.Any())
                return BadRequest("لم يتم تقديم أي تحويلات");

            var transfers = await _context.Transfers
                .Where(t => transferIds.Contains(t.TransferId))
                .ToListAsync();

            if (!transfers.Any())
                return NotFound("No matching transfers found");

            int rejectedCount = 0;
            var errors = new List<string>();

            foreach (var transfer in transfers)
            {
                if (transfer.Status == TransferStatus.Refused)
                {
                    errors.Add($"Transfer {transfer.TransferId} already refused");
                    continue;
                }

                // Only allow rejecting transfers sent to this user
                bool isReceived = transfer.ToUserId.HasValue && transfer.ToUserId.Value == userId;
                if (!isReceived)
                {
                    errors.Add($"Not authorized to refuse transfer {transfer.TransferId}");
                    continue;
                }

                transfer.Status = TransferStatus.Refused;
                transfer.DateAccepted = DateTime.Now; // you could rename this to DateHandled if you want clearer semantics
                rejectedCount++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"✅ تم رفض {rejectedCount} إحالة بنجاح",
                errors
            });
        }

        [HttpPut("update-batch")]
        public async Task<IActionResult> UpdateBatchTransfers([FromBody] BatchUpdateRequest request)
        {
            if (request.TransferIds == null || !request.TransferIds.Any())
                return BadRequest("No transfers selected.");

            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username))
                return Unauthorized("🚫 يجب تسجيل الدخول أولاً.");

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => (u.FirstName + " " + u.LastName) == username);
            if (currentUser == null)
                return Unauthorized("User not found.");

            var transfers = await _context.Transfers
                .Where(t => request.TransferIds.Contains(t.TransferId))
                .ToListAsync();

            if (!transfers.Any())
                return NotFound("No matching transfers found.");

            foreach (var t in transfers)
            {
                // Only allow modifying if current user is the sender
                if (t.FromUserId != currentUser.Id || t.Status == TransferStatus.Accepted)
                    continue;

                if (!string.IsNullOrEmpty(request.ToRole))
                    t.ToRole = request.ToRole;

                if (request.ToUserId.HasValue)
                    t.ToUserId = request.ToUserId;

                if (!string.IsNullOrEmpty(request.Content))
                    t.Content = request.Content;

                t.Status = TransferStatus.Sent; // reset status if needed
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"✅ تم تعديل {transfers.Count} إحالة بنجاح",
                transfers
            });
        }
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
