using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class ResidentConfiguration : IEntityTypeConfiguration<Resident>
{
    internal static readonly Guid PrimaryResidentId = Guid.Parse("5963f7c1-65eb-4de4-b4da-1df64e68545e");
    internal static readonly Guid SecondaryResidentId = Guid.Parse("e1808b68-75ad-4f14-8c1e-805d6e7a3f13");

    public void Configure(EntityTypeBuilder<Resident> builder)
    {
        builder.ToTable("Residents");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.FirstName).HasMaxLength(128).IsRequired();
        builder.Property(r => r.LastName).HasMaxLength(128).IsRequired();
        builder.Property(r => r.Email).HasMaxLength(256);
        builder.Property(r => r.PhoneNumber).HasMaxLength(32);

        builder.HasIndex(r => r.BuildingId);
        builder.HasIndex(r => r.AccountId);
        builder.HasIndex(r => new { r.BuildingId, r.Email });

        builder.HasOne(r => r.Building)
            .WithMany(b => b.Residents)
            .HasForeignKey(r => r.BuildingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Account)
            .WithMany(a => a.Residents)
            .HasForeignKey(r => r.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            new Resident
            {
                Id = PrimaryResidentId,
                BuildingId = BuildingConfiguration.BuildingId,
                AccountId = AccountConfiguration.AccountId,
                FirstName = "Jamie",
                LastName = "Rivera",
                Email = "jamie.rivera@example.com",
                PhoneNumber = "+1-555-0101",
                IsPrimary = true,
                MoveInDate = new DateTime(2023, 01, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Resident
            {
                Id = SecondaryResidentId,
                BuildingId = BuildingConfiguration.BuildingId,
                AccountId = AccountConfiguration.AccountId,
                FirstName = "Alex",
                LastName = "Rivera",
                Email = "alex.rivera@example.com",
                PhoneNumber = "+1-555-0102",
                IsPrimary = false,
                MoveInDate = new DateTime(2023, 01, 15, 0, 0, 0, DateTimeKind.Utc)
            });
    }
}
