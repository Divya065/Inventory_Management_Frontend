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
    public DbSet<Product> Products { get; set; }
    public DbSet<Offer> Offers { get; set; }
    public DbSet<CartItem> CartItems { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<PaymentOrder> PaymentOrders { get; set; }
    public DbSet<ParkedCart> ParkedCarts { get; set; }
    public DbSet<CartState> CartStates { get; set; }
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<CartItem>(x => x.HasKey(p => new { p.AppUserId, p.ProductID }));
        builder.Entity<CartItem>()
        .HasOne(u => u.AppUser)
        .WithMany(u => u.CartItems)
        .HasForeignKey(u => u.AppUserId);

        builder.Entity<CartItem>()
        .HasOne(u => u.Product)
        .WithMany(u => u.CartItems)
        .HasForeignKey(u => u.ProductID);

        builder.Entity<ParkedCart>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.AppUserId);
            e.HasIndex(p => new { p.AppUserId, p.CustomerName });
        });

        builder.Entity<CartState>(e =>
        {
            e.HasKey(c => c.AppUserId);
        });

        builder.Entity<Product>(e =>
        {
            e.Property(s => s.Brand).HasMaxLength(120);
            e.HasIndex(s => s.Brand);
            e.Property(s => s.Barcode).HasMaxLength(64);
            e.HasIndex(s => s.OwnerUserId);
            e.HasOne(s => s.Owner)
                .WithMany(u => u.Products)
                .HasForeignKey(s => s.OwnerUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AppUser>(e =>
        {
            e.Property(u => u.ShopName).HasMaxLength(120);
        });

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
