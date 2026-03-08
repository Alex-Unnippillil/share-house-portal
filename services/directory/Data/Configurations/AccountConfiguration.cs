using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    internal static readonly Guid AccountId = Guid.Parse("8b37db1c-3ee5-4754-9f0b-0a7b1d3aa1ef");

    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.AccountNumber).HasMaxLength(32).IsRequired();
        builder.Property(a => a.Status).HasMaxLength(32).IsRequired();
        builder.Property(a => a.Balance).HasColumnType("decimal(18,2)");

        builder.HasIndex(a => a.BuildingId);
        builder.HasIndex(a => new { a.BuildingId, a.AccountNumber }).IsUnique();
        builder.HasIndex(a => a.UnitId);

        builder.HasOne(a => a.Building)
            .WithMany(b => b.Accounts)
            .HasForeignKey(a => a.BuildingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Unit)
            .WithMany(u => u.Accounts)
            .HasForeignKey(a => a.UnitId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(new Account
        {
            Id = AccountId,
            BuildingId = BuildingConfiguration.BuildingId,
            UnitId = UnitConfiguration.Unit101Id,
            AccountNumber = "MAIN-101-001",
            Status = "Active",
            StartDate = new DateTime(2023, 01, 01, 0, 0, 0, DateTimeKind.Utc),
            Balance = 150.00m
        });
    }
}
