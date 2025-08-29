using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication2.Models
{
    public class Entity
    {
        public int EntityId { get; set; }

        [Required]
        public string EntityNumber { get; set; } = string.Empty;

        [Required]
        public string Sujet { get; set; } = string.Empty;

        [Required]
        public string Part1 { get; set; } = string.Empty;

        [Required]
        public string Part2 { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        [Required]
        public string Magistrale { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty; // "Dossier" or "File"

        // 🔑 Owner reference
        [Required]
        public int OwnerId { get; set; }   // foreign key to User
        [ForeignKey("OwnerId")]
        public User Owner { get; set; }   // navigation property

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow.Date;

    }
}
