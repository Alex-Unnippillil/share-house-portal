using DirectoryService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DirectoryService.Data.Configurations;

public class BuildingConfiguration : IEntityTypeConfiguration<Building>
{
    internal static readonly Guid BuildingId = Guid.Parse("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801");

    public void Configure(EntityTypeBuilder<Building> builder)
    {
        builder.ToTable("Buildings");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Code).HasMaxLength(32).IsRequired();
        builder.Property(b => b.Name).HasMaxLength(200).IsRequired();
        builder.Property(b => b.AddressLine1).HasMaxLength(256);
        builder.Property(b => b.AddressLine2).HasMaxLength(256);
        builder.Property(b => b.City).HasMaxLength(128);
        builder.Property(b => b.State).HasMaxLength(64);
        builder.Property(b => b.PostalCode).HasMaxLength(32);

        builder.HasIndex(b => b.Code).IsUnique();
        builder.HasIndex(b => b.CreatedAtUtc);

        builder.HasData(new Building
        {
            Id = BuildingId,
            Code = "MAIN",
            Name = "Main Street Building",
            AddressLine1 = "123 Main Street",
            City = "Metropolis",
            State = "NY",
            PostalCode = "10001",
            CreatedAtUtc = new DateTime(2020, 01, 01, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
