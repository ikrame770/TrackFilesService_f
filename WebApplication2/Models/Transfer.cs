using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication2.Models
{
    public enum TransferStatus
    {
        Sent,
        Accepted,
        Refused
    }

    public class Transfer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int TransferId { get; set; }

        // Foreign key to the Entity
        [Required]
        public int EntityId { get; set; }
        [ForeignKey("EntityId")]
        public Entity Entity { get; set; } = null!;

        // From User (always required)
        [Required]
        public int FromUserId { get; set; }
        [ForeignKey("FromUserId")]
        public User From { get; set; } = null!;

        // To User (nullable for role-wide transfer)
        public int? ToUserId { get; set; }
        [ForeignKey("ToUserId")]
        public User? To { get; set; }

        [Required]
        public string? ToRole { get; set; }

        [Required]
        public DateTime DateSent { get; set; } = DateTime.Now.Date;
       
        [Required]
        public TransferStatus Status { get; set; } = TransferStatus.Sent;

        public DateTime? DateAccepted { get; set; }

        public string? Content { get; set; }

        public Transfer() { }
    }
}
