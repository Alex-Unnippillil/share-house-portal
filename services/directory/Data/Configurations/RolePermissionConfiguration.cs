using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.ToTable("RolePermissions");

        builder.HasKey(rp => new { rp.RoleId, rp.PermissionId });

        builder.HasIndex(rp => rp.PermissionId);

        builder.HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            new RolePermission
            {
                RoleId = RoleConfiguration.PropertyManagerRoleId,
                PermissionId = PermissionConfiguration.ManageAccountsPermissionId
            },
            new RolePermission
            {
                RoleId = RoleConfiguration.PropertyManagerRoleId,
                PermissionId = PermissionConfiguration.ManageResidentsPermissionId
            },
            new RolePermission
            {
                RoleId = RoleConfiguration.PropertyManagerRoleId,
                PermissionId = PermissionConfiguration.ViewAuditPermissionId
            },
            new RolePermission
            {
                RoleId = RoleConfiguration.LeasingAgentRoleId,
                PermissionId = PermissionConfiguration.ManageAccountsPermissionId
            },
            new RolePermission
            {
                RoleId = RoleConfiguration.LeasingAgentRoleId,
                PermissionId = PermissionConfiguration.ManageResidentsPermissionId
            },
            new RolePermission
            {
                RoleId = RoleConfiguration.MaintenanceRoleId,
                PermissionId = PermissionConfiguration.ManageResidentsPermissionId
            });
    }
}
