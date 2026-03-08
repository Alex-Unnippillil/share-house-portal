using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    internal static readonly Guid AuditLogId = Guid.Parse("61f59f0e-d904-42ea-86eb-132cd550ccaa");

    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.EntityName).HasMaxLength(128).IsRequired();
        builder.Property(a => a.Action).HasMaxLength(64).IsRequired();
        builder.Property(a => a.PerformedBy).HasMaxLength(256).IsRequired();
        builder.Property(a => a.CorrelationId).HasMaxLength(64);

        builder.HasIndex(a => a.BuildingId);
        builder.HasIndex(a => new { a.BuildingId, a.PerformedAtUtc });

        builder.HasOne(a => a.Building)
            .WithMany(b => b.AuditLogs)
            .HasForeignKey(a => a.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(new AuditLog
        {
            Id = AuditLogId,
            BuildingId = BuildingConfiguration.BuildingId,
            EntityName = "Account",
            EntityId = AccountConfiguration.AccountId,
            Action = "Seed",
            Changes = "{\"AccountCreated\":true}",
            PerformedBy = "system-seed",
            PerformedAtUtc = new DateTime(2023, 01, 01, 0, 0, 0, DateTimeKind.Utc),
            CorrelationId = "seed-boot"
        });
    }
}
