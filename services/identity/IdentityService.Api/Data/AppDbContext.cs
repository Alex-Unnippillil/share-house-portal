using IdentityService.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<OAuthClient> OAuthClients => Set<OAuthClient>();
    public DbSet<AuthorizationCode> AuthorizationCodes => Set<AuthorizationCode>();
    public DbSet<ScimGroup> ScimGroups => Set<ScimGroup>();
    public DbSet<ScimGroupMember> ScimGroupMembers => Set<ScimGroupMember>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasMany(u => u.RefreshTokens)
            .WithOne(t => t.User!)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasMany(u => u.PasswordResetTokens)
            .WithOne(t => t.User!)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasMany(u => u.AuthorizationCodes)
            .WithOne(c => c.User!)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OAuthClient>()
            .HasIndex(c => c.ClientId)
            .IsUnique();

        modelBuilder.Entity<OAuthClient>()
            .HasMany(c => c.AuthorizationCodes)
            .WithOne(code => code.Client!)
            .HasForeignKey(code => code.OAuthClientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ScimGroupMember>()
            .HasIndex(m => new { m.GroupId, m.UserId })
            .IsUnique();

        modelBuilder.Entity<ScimGroupMember>()
            .HasOne(m => m.Group)
            .WithMany(g => g.Members)
            .HasForeignKey(m => m.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ScimGroupMember>()
            .HasOne(m => m.User)
            .WithMany(u => u.GroupMemberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.Token)
            .IsUnique();

        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(t => t.Token)
            .IsUnique();

        modelBuilder.Entity<AuthorizationCode>()
            .HasIndex(c => c.Code)
            .IsUnique();
    }
}
