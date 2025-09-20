using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ShareHousePortal.Infrastructure.Data;

#nullable disable

namespace ShareHousePortal.Infrastructure.Migrations
{
    [DbContext(typeof(ShareHousePortalDbContext))]
    partial class ShareHousePortalDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.4")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.Building", b =>
            {
                b.Property<Guid>("Id")
                    .HasColumnType("uniqueidentifier");

                b.Property<string>("AddressLine1")
                    .HasMaxLength(200)
                    .HasColumnType("nvarchar(200)");

                b.Property<string>("AddressLine2")
                    .HasMaxLength(200)
                    .HasColumnType("nvarchar(200)");

                b.Property<string>("City")
                    .HasMaxLength(100)
                    .HasColumnType("nvarchar(100)");

                b.Property<string>("Name")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("nvarchar(200)");

                b.Property<string>("PostalCode")
                    .HasMaxLength(20)
                    .HasColumnType("nvarchar(20)");

                b.Property<string>("State")
                    .HasMaxLength(100)
                    .HasColumnType("nvarchar(100)");

                b.HasKey("Id");

                b.ToTable("Buildings");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceLevelAgreementTarget", b =>
            {
                b.Property<Guid>("Id")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime?>("EffectiveUntil")
                    .HasColumnType("datetime2");

                b.Property<int>("ResolutionHours")
                    .HasColumnType("int");

                b.Property<int>("ResponseHours")
                    .HasColumnType("int");

                b.Property<Guid>("ServiceRequestId")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("datetime2");

                b.HasKey("Id");

                b.HasIndex("ServiceRequestId")
                    .IsUnique();

                b.ToTable("ServiceLevelAgreementTargets");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceRequest", b =>
            {
                b.Property<Guid>("Id")
                    .HasColumnType("uniqueidentifier");

                b.Property<Guid>("BuildingId")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime?>("CompletedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("Description")
                    .HasMaxLength(2000)
                    .HasColumnType("nvarchar(2000)");

                b.Property<DateTime?>("DueBy")
                    .HasColumnType("datetime2");

                b.Property<string>("Notes")
                    .HasColumnType("nvarchar(max)");

                b.Property<string>("Priority")
                    .IsRequired()
                    .HasMaxLength(32)
                    .HasColumnType("nvarchar(32)");

                b.Property<DateTime>("RequestedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("RequestedBy")
                    .IsRequired()
                    .HasMaxLength(150)
                    .HasColumnType("nvarchar(150)");

                b.Property<string>("RequestedByEmail")
                    .HasMaxLength(320)
                    .HasColumnType("nvarchar(320)");

                b.Property<string>("ReferenceNumber")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasColumnType("nvarchar(50)");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("nvarchar(64)");

                b.Property<string>("Title")
                    .IsRequired()
                    .HasMaxLength(250)
                    .HasColumnType("nvarchar(250)");

                b.HasKey("Id");

                b.HasIndex("BuildingId");

                b.HasIndex("ReferenceNumber")
                    .IsUnique();

                b.HasIndex("Status");

                b.ToTable("ServiceRequests");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceRequestStatusHistory", b =>
            {
                b.Property<Guid>("Id")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime>("ChangedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("ChangedBy")
                    .IsRequired()
                    .HasMaxLength(150)
                    .HasColumnType("nvarchar(150)");

                b.Property<string>("Comment")
                    .HasMaxLength(1000)
                    .HasColumnType("nvarchar(1000)");

                b.Property<string>("FromStatus")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("nvarchar(64)");

                b.Property<Guid>("ServiceRequestId")
                    .HasColumnType("uniqueidentifier");

                b.Property<string>("ToStatus")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("nvarchar(64)");

                b.HasKey("Id");

                b.HasIndex("ServiceRequestId");

                b.ToTable("ServiceRequestStatusHistory");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.WorkOrder", b =>
            {
                b.Property<Guid>("Id")
                    .HasColumnType("uniqueidentifier");

                b.Property<Guid>("BuildingId")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime?>("CompletedAt")
                    .HasColumnType("datetime2");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("Notes")
                    .HasColumnType("nvarchar(max)");

                b.Property<Guid>("ServiceRequestId")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime?>("ScheduledFor")
                    .HasColumnType("datetime2");

                b.Property<string>("Status")
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnType("nvarchar(64)");

                b.Property<string>("Summary")
                    .HasMaxLength(500)
                    .HasColumnType("nvarchar(500)");

                b.Property<string>("WorkOrderNumber")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasColumnType("nvarchar(50)");

                b.HasKey("Id");

                b.HasIndex("BuildingId");

                b.HasIndex("ServiceRequestId");

                b.HasIndex("Status");

                b.HasIndex("WorkOrderNumber")
                    .IsUnique();

                b.ToTable("WorkOrders");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.WorkOrderAssignment", b =>
            {
                b.Property<Guid>("Id")
                    .HasColumnType("uniqueidentifier");

                b.Property<DateTime?>("AcknowledgedAt")
                    .HasColumnType("datetime2");

                b.Property<DateTime>("AssignedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("AssigneeId")
                    .IsRequired()
                    .HasMaxLength(100)
                    .HasColumnType("nvarchar(100)");

                b.Property<string>("AssigneeName")
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnType("nvarchar(200)");

                b.Property<DateTime?>("CompletedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("Notes")
                    .HasColumnType("nvarchar(max)");

                b.Property<string>("Role")
                    .HasMaxLength(150)
                    .HasColumnType("nvarchar(150)");

                b.Property<Guid>("WorkOrderId")
                    .HasColumnType("uniqueidentifier");

                b.HasKey("Id");

                b.HasIndex("WorkOrderId");

                b.ToTable("WorkOrderAssignments");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceLevelAgreementTarget", b =>
            {
                b.HasOne("ShareHousePortal.Domain.Entities.ServiceRequest", "ServiceRequest")
                    .WithOne("SlaTarget")
                    .HasForeignKey("ShareHousePortal.Domain.Entities.ServiceLevelAgreementTarget", "ServiceRequestId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.Navigation("ServiceRequest");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceRequest", b =>
            {
                b.HasOne("ShareHousePortal.Domain.Entities.Building", "Building")
                    .WithMany("ServiceRequests")
                    .HasForeignKey("BuildingId")
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();

                b.Navigation("Building");
                b.Navigation("SlaTarget");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceRequestStatusHistory", b =>
            {
                b.HasOne("ShareHousePortal.Domain.Entities.ServiceRequest", "ServiceRequest")
                    .WithMany("StatusHistory")
                    .HasForeignKey("ServiceRequestId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.Navigation("ServiceRequest");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.WorkOrder", b =>
            {
                b.HasOne("ShareHousePortal.Domain.Entities.Building", "Building")
                    .WithMany("WorkOrders")
                    .HasForeignKey("BuildingId")
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();

                b.HasOne("ShareHousePortal.Domain.Entities.ServiceRequest", "ServiceRequest")
                    .WithMany("WorkOrders")
                    .HasForeignKey("ServiceRequestId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.Navigation("Building");
                b.Navigation("ServiceRequest");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.WorkOrderAssignment", b =>
            {
                b.HasOne("ShareHousePortal.Domain.Entities.WorkOrder", "WorkOrder")
                    .WithMany("Assignments")
                    .HasForeignKey("WorkOrderId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();

                b.Navigation("WorkOrder");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.Building", b =>
            {
                b.Navigation("ServiceRequests");
                b.Navigation("WorkOrders");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.ServiceRequest", b =>
            {
                b.Navigation("StatusHistory");
                b.Navigation("WorkOrders");
            });

            modelBuilder.Entity("ShareHousePortal.Domain.Entities.WorkOrder", b =>
            {
                b.Navigation("Assignments");
            });
#pragma warning restore 612, 618
        }
    }
}
