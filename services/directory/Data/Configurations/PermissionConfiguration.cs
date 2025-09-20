using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    internal static readonly Guid ManageAccountsPermissionId = Guid.Parse("927153ee-6355-4c24-8873-5014a4f14f7c");
    internal static readonly Guid ManageResidentsPermissionId = Guid.Parse("332f15d0-06c7-4ffa-8a19-0a6c8b3d7a71");
    internal static readonly Guid ViewAuditPermissionId = Guid.Parse("9d61ac16-9dba-4a98-91df-46e4b2a938c9");

    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("Permissions");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).HasMaxLength(128).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(256);

        builder.HasIndex(p => p.Name).IsUnique();

        builder.HasData(
            new Permission
            {
                Id = ManageAccountsPermissionId,
                Name = "ManageAccounts",
                Description = "Create, update, and archive tenant accounts"
            },
            new Permission
            {
                Id = ManageResidentsPermissionId,
                Name = "ManageResidents",
                Description = "Maintain resident rosters and contact information"
            },
            new Permission
            {
                Id = ViewAuditPermissionId,
                Name = "ViewAuditTrail",
                Description = "Access and review audit log history"
            });
    }
}
