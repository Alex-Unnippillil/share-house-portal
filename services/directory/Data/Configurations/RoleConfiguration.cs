using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    internal static readonly Guid PropertyManagerRoleId = Guid.Parse("132f35a0-476e-4b0a-863d-72f4c2cd7e5b");
    internal static readonly Guid LeasingAgentRoleId = Guid.Parse("ff5c4ee4-a6f5-4e01-8ac8-11ac5f2dfc25");
    internal static readonly Guid MaintenanceRoleId = Guid.Parse("8f7c7c87-5457-4f2d-8803-144612e3a59a");

    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.ToTable("Roles");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Name).HasMaxLength(128).IsRequired();
        builder.Property(r => r.Description).HasMaxLength(256);

        builder.HasIndex(r => r.Name).IsUnique();

        builder.HasData(
            new Role
            {
                Id = PropertyManagerRoleId,
                Name = "PropertyManager",
                Description = "Oversees building operations and tenant lifecycle"
            },
            new Role
            {
                Id = LeasingAgentRoleId,
                Name = "LeasingAgent",
                Description = "Manages leasing workflows and resident onboarding"
            },
            new Role
            {
                Id = MaintenanceRoleId,
                Name = "Maintenance",
                Description = "Handles maintenance requests and building upkeep"
            });
    }
}
