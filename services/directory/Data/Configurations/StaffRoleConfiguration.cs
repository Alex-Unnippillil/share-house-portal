using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class StaffRoleConfiguration : IEntityTypeConfiguration<StaffRole>
{
    public void Configure(EntityTypeBuilder<StaffRole> builder)
    {
        builder.ToTable("StaffRoles");

        builder.HasKey(sr => new { sr.StaffId, sr.RoleId });

        builder.HasIndex(sr => sr.BuildingId);

        builder.HasOne(sr => sr.Staff)
            .WithMany(s => s.StaffRoles)
            .HasForeignKey(sr => sr.StaffId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sr => sr.Role)
            .WithMany(r => r.StaffRoles)
            .HasForeignKey(sr => sr.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sr => sr.Building)
            .WithMany()
            .HasForeignKey(sr => sr.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(new StaffRole
        {
            StaffId = StaffConfiguration.StaffId,
            RoleId = RoleConfiguration.PropertyManagerRoleId,
            BuildingId = BuildingConfiguration.BuildingId
        });
    }
}
