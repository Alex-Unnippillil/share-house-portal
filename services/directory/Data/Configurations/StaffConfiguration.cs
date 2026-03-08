using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    internal static readonly Guid StaffId = Guid.Parse("63bb7e58-8c0f-4e7d-bb04-740a2eb3f901");

    public void Configure(EntityTypeBuilder<Staff> builder)
    {
        builder.ToTable("Staff");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.FirstName).HasMaxLength(128).IsRequired();
        builder.Property(s => s.LastName).HasMaxLength(128).IsRequired();
        builder.Property(s => s.Email).HasMaxLength(256).IsRequired();
        builder.Property(s => s.PhoneNumber).HasMaxLength(32);

        builder.HasIndex(s => s.BuildingId);
        builder.HasIndex(s => new { s.BuildingId, s.Email }).IsUnique();

        builder.HasOne(s => s.Building)
            .WithMany(b => b.StaffMembers)
            .HasForeignKey(s => s.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(new Staff
        {
            Id = StaffId,
            BuildingId = BuildingConfiguration.BuildingId,
            FirstName = "Morgan",
            LastName = "Lee",
            Email = "morgan.lee@example.com",
            PhoneNumber = "+1-555-0201",
            HireDate = new DateTime(2020, 06, 15, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
