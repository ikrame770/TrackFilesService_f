using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.SqlServer;
using WebApplication2.Models;

namespace WebApplication2.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Entity> Entities { get; set; } = null!;
        public DbSet<Transfer> Transfers { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Entity>()
                .HasOne(e => e.Owner)
                .WithMany()
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.NoAction); // or Restrict

            modelBuilder.Entity<Entity>()
                .Property(e => e.CreatedAt)
                .HasColumnType("date");

            modelBuilder.Entity<Transfer>()
                .Property(t => t.DateSent)
                .HasColumnType("date");

            modelBuilder.Entity<Transfer>()
                .Property(t => t.DateAccepted)
                .HasColumnType("date");

        }

    }

}

