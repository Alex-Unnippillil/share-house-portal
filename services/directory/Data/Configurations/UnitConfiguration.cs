using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class UnitConfiguration : IEntityTypeConfiguration<Unit>
{
    internal static readonly Guid Unit101Id = Guid.Parse("7a81ce9b-889e-4f50-8f0a-1c9ce0597a80");
    internal static readonly Guid Unit102Id = Guid.Parse("21f3d321-1a30-4b28-82f6-74a24a0e6f77");

    public void Configure(EntityTypeBuilder<Unit> builder)
    {
        builder.ToTable("Units");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Identifier).HasMaxLength(64).IsRequired();
        builder.Property(u => u.Bedrooms).HasDefaultValue(1);
        builder.Property(u => u.Bathrooms).HasDefaultValue(1);
        builder.Property(u => u.SquareFeet).HasDefaultValue(500);

        builder.HasIndex(u => u.BuildingId);
        builder.HasIndex(u => new { u.BuildingId, u.Identifier }).IsUnique();

        builder.HasOne(u => u.Building)
            .WithMany(b => b.Units)
            .HasForeignKey(u => u.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(
            new Unit
            {
                Id = Unit101Id,
                BuildingId = BuildingConfiguration.BuildingId,
                Identifier = "101",
                FloorNumber = 1,
                Bedrooms = 2,
                Bathrooms = 1,
                SquareFeet = 850,
                IsActive = true
            },
            new Unit
            {
                Id = Unit102Id,
                BuildingId = BuildingConfiguration.BuildingId,
                Identifier = "102",
                FloorNumber = 1,
                Bedrooms = 3,
                Bathrooms = 2,
                SquareFeet = 1050,
                IsActive = true
            });
    }
}
