using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ShareHousePortal.Domain.Entities;
using ShareHousePortal.Domain.Enums;

namespace ShareHousePortal.Infrastructure.Data;

public class ShareHousePortalDbContext : DbContext
{
    public ShareHousePortalDbContext(DbContextOptions<ShareHousePortalDbContext> options)
        : base(options)
    {
    }

    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderAssignment> WorkOrderAssignments => Set<WorkOrderAssignment>();
    public DbSet<ServiceLevelAgreementTarget> ServiceLevelAgreementTargets => Set<ServiceLevelAgreementTarget>();
    public DbSet<ServiceRequestStatusHistory> ServiceRequestStatusHistory => Set<ServiceRequestStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureBuilding(modelBuilder);
        ConfigureServiceRequest(modelBuilder);
        ConfigureWorkOrder(modelBuilder);
        ConfigureWorkOrderAssignment(modelBuilder);
        ConfigureServiceLevelAgreementTarget(modelBuilder);
        ConfigureServiceRequestStatusHistory(modelBuilder);
    }

    private static void ConfigureBuilding(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Building>(builder =>
        {
            builder.ToTable("Buildings");
            builder.HasKey(b => b.Id);
            builder.Property(b => b.Name)
                .IsRequired()
                .HasMaxLength(200);
            builder.Property(b => b.AddressLine1)
                .HasMaxLength(200);
            builder.Property(b => b.AddressLine2)
                .HasMaxLength(200);
            builder.Property(b => b.City)
                .HasMaxLength(100);
            builder.Property(b => b.State)
                .HasMaxLength(100);
            builder.Property(b => b.PostalCode)
                .HasMaxLength(20);
        });
    }

    private static void ConfigureServiceRequest(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ServiceRequest>(builder =>
        {
            builder.ToTable("ServiceRequests");
            builder.HasKey(sr => sr.Id);

            builder.Property(sr => sr.ReferenceNumber)
                .IsRequired()
                .HasMaxLength(50);
            builder.HasIndex(sr => sr.ReferenceNumber)
                .IsUnique();

            builder.Property(sr => sr.Title)
                .IsRequired()
                .HasMaxLength(250);
            builder.Property(sr => sr.Description)
                .HasMaxLength(2000);

            builder.Property(sr => sr.Status)
                .HasConversion(new EnumToStringConverter<ServiceRequestStatus>())
                .HasMaxLength(64)
                .IsRequired();
            builder.HasIndex(sr => sr.Status);

            builder.Property(sr => sr.Priority)
                .HasConversion(new EnumToStringConverter<ServiceRequestPriority>())
                .HasMaxLength(32)
                .IsRequired();

            builder.Property(sr => sr.RequestedBy)
                .IsRequired()
                .HasMaxLength(150);
            builder.Property(sr => sr.RequestedByEmail)
                .HasMaxLength(320);

            builder.HasIndex(sr => sr.BuildingId);

            builder.HasOne(sr => sr.Building)
                .WithMany(b => b.ServiceRequests)
                .HasForeignKey(sr => sr.BuildingId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(sr => sr.SlaTarget)
                .WithOne(st => st.ServiceRequest)
                .HasForeignKey<ServiceLevelAgreementTarget>(st => st.ServiceRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureWorkOrder(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkOrder>(builder =>
        {
            builder.ToTable("WorkOrders");
            builder.HasKey(wo => wo.Id);

            builder.Property(wo => wo.WorkOrderNumber)
                .IsRequired()
                .HasMaxLength(50);
            builder.HasIndex(wo => wo.WorkOrderNumber)
                .IsUnique();

            builder.Property(wo => wo.Status)
                .HasConversion(new EnumToStringConverter<WorkOrderStatus>())
                .HasMaxLength(64)
                .IsRequired();
            builder.HasIndex(wo => wo.Status);
            builder.HasIndex(wo => wo.BuildingId);

            builder.Property(wo => wo.Summary)
                .HasMaxLength(500);

            builder.HasOne(wo => wo.ServiceRequest)
                .WithMany(sr => sr.WorkOrders)
                .HasForeignKey(wo => wo.ServiceRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(wo => wo.Building)
                .WithMany(b => b.WorkOrders)
                .HasForeignKey(wo => wo.BuildingId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureWorkOrderAssignment(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkOrderAssignment>(builder =>
        {
            builder.ToTable("WorkOrderAssignments");
            builder.HasKey(woa => woa.Id);

            builder.Property(woa => woa.AssigneeId)
                .IsRequired()
                .HasMaxLength(100);
            builder.Property(woa => woa.AssigneeName)
                .IsRequired()
                .HasMaxLength(200);
            builder.Property(woa => woa.Role)
                .HasMaxLength(150);

            builder.HasIndex(woa => woa.WorkOrderId);

            builder.HasOne(woa => woa.WorkOrder)
                .WithMany(wo => wo.Assignments)
                .HasForeignKey(woa => woa.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureServiceLevelAgreementTarget(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ServiceLevelAgreementTarget>(builder =>
        {
            builder.ToTable("ServiceLevelAgreementTargets");
            builder.HasKey(st => st.Id);

            builder.Property(st => st.ResponseHours)
                .IsRequired();
            builder.Property(st => st.ResolutionHours)
                .IsRequired();

            builder.HasIndex(st => st.ServiceRequestId)
                .IsUnique();
        });
    }

    private static void ConfigureServiceRequestStatusHistory(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ServiceRequestStatusHistory>(builder =>
        {
            builder.ToTable("ServiceRequestStatusHistory");
            builder.HasKey(h => h.Id);

            builder.Property(h => h.FromStatus)
                .HasConversion(new EnumToStringConverter<ServiceRequestStatus>())
                .HasMaxLength(64)
                .IsRequired();
            builder.Property(h => h.ToStatus)
                .HasConversion(new EnumToStringConverter<ServiceRequestStatus>())
                .HasMaxLength(64)
                .IsRequired();
            builder.Property(h => h.ChangedBy)
                .IsRequired()
                .HasMaxLength(150);
            builder.Property(h => h.Comment)
                .HasMaxLength(1000);

            builder.HasIndex(h => h.ServiceRequestId);

            builder.HasOne(h => h.ServiceRequest)
                .WithMany(sr => sr.StatusHistory)
                .HasForeignKey(h => h.ServiceRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
