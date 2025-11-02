using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Project_1.Models;

namespace Project_1.Data;

public class ApplicationDBContext : IdentityDbContext<AppUser>
{
    public ApplicationDBContext(DbContextOptions dbContextOptions) : base(dbContextOptions)
    {

    }
    public DbSet<Stock> Stocks { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<Portfolio> Portfolios { get; set; }
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Portfolio>(x => x.HasKey(p => new { p.AppUserId, p.StockID }));
        builder.Entity<Portfolio>()
        .HasOne(u => u.AppUser)
        .WithMany(u => u.Portfolios)
        .HasForeignKey(u => u.AppUserId);

        builder.Entity<Portfolio>()
        .HasOne(u => u.Stock)
        .WithMany(u => u.Portfolios)
        .HasForeignKey(u => u.StockID);

        List<IdentityRole> roles = new List<IdentityRole>
        {
            new IdentityRole
            {
                Name = "Admin",
                NormalizedName = "ADMIN"
            },
            new IdentityRole
            {
                Name = "User",
                NormalizedName = "USER"
            }
        };
        builder.Entity<IdentityRole>().HasData(roles);
    }
}
