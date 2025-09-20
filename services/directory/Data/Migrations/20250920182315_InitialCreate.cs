using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace DirectoryService.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Buildings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    AddressLine1 = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    AddressLine2 = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    City = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    State = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    PostalCode = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Buildings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuildingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EntityName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    EntityId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Action = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Changes = table.Column<string>(type: "TEXT", nullable: false),
                    PerformedBy = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    PerformedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CorrelationId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Staff",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuildingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FirstName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    LastName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    HireDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TerminationDate = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Staff", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Staff_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Units",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuildingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Identifier = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    FloorNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    Bedrooms = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    Bathrooms = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    SquareFeet = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 500),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Units_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PermissionId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => new { x.RoleId, x.PermissionId });
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StaffRoles",
                columns: table => new
                {
                    StaffId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuildingId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffRoles", x => new { x.StaffId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_StaffRoles_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StaffRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StaffRoles_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuildingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AccountNumber = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Balance = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Accounts_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Accounts_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Residents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuildingId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AccountId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FirstName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    LastName = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    MoveInDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MoveOutDate = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Residents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Residents_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Residents_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Buildings",
                columns: new[] { "Id", "AddressLine1", "AddressLine2", "City", "Code", "CreatedAtUtc", "Name", "PostalCode", "State" },
                values: new object[] { new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), "123 Main Street", null, "Metropolis", "MAIN", new DateTime(2020, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Main Street Building", "10001", "NY" });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Id", "Description", "Name" },
                values: new object[,]
                {
                    { new Guid("332f15d0-06c7-4ffa-8a19-0a6c8b3d7a71"), "Maintain resident rosters and contact information", "ManageResidents" },
                    { new Guid("927153ee-6355-4c24-8873-5014a4f14f7c"), "Create, update, and archive tenant accounts", "ManageAccounts" },
                    { new Guid("9d61ac16-9dba-4a98-91df-46e4b2a938c9"), "Access and review audit log history", "ViewAuditTrail" }
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "Description", "Name" },
                values: new object[,]
                {
                    { new Guid("132f35a0-476e-4b0a-863d-72f4c2cd7e5b"), "Oversees building operations and tenant lifecycle", "PropertyManager" },
                    { new Guid("8f7c7c87-5457-4f2d-8803-144612e3a59a"), "Handles maintenance requests and building upkeep", "Maintenance" },
                    { new Guid("ff5c4ee4-a6f5-4e01-8ac8-11ac5f2dfc25"), "Manages leasing workflows and resident onboarding", "LeasingAgent" }
                });

            migrationBuilder.InsertData(
                table: "AuditLogs",
                columns: new[] { "Id", "Action", "BuildingId", "Changes", "CorrelationId", "EntityId", "EntityName", "PerformedAtUtc", "PerformedBy" },
                values: new object[] { new Guid("61f59f0e-d904-42ea-86eb-132cd550ccaa"), "Seed", new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), "{\"AccountCreated\":true}", "seed-boot", new Guid("8b37db1c-3ee5-4754-9f0b-0a7b1d3aa1ef"), "Account", new DateTime(2023, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "system-seed" });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { new Guid("332f15d0-06c7-4ffa-8a19-0a6c8b3d7a71"), new Guid("132f35a0-476e-4b0a-863d-72f4c2cd7e5b") },
                    { new Guid("927153ee-6355-4c24-8873-5014a4f14f7c"), new Guid("132f35a0-476e-4b0a-863d-72f4c2cd7e5b") },
                    { new Guid("9d61ac16-9dba-4a98-91df-46e4b2a938c9"), new Guid("132f35a0-476e-4b0a-863d-72f4c2cd7e5b") },
                    { new Guid("332f15d0-06c7-4ffa-8a19-0a6c8b3d7a71"), new Guid("8f7c7c87-5457-4f2d-8803-144612e3a59a") },
                    { new Guid("332f15d0-06c7-4ffa-8a19-0a6c8b3d7a71"), new Guid("ff5c4ee4-a6f5-4e01-8ac8-11ac5f2dfc25") },
                    { new Guid("927153ee-6355-4c24-8873-5014a4f14f7c"), new Guid("ff5c4ee4-a6f5-4e01-8ac8-11ac5f2dfc25") }
                });

            migrationBuilder.InsertData(
                table: "Staff",
                columns: new[] { "Id", "BuildingId", "Email", "FirstName", "HireDate", "LastName", "PhoneNumber", "TerminationDate" },
                values: new object[] { new Guid("63bb7e58-8c0f-4e7d-bb04-740a2eb3f901"), new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), "morgan.lee@example.com", "Morgan", new DateTime(2020, 6, 15, 0, 0, 0, 0, DateTimeKind.Utc), "Lee", "+1-555-0201", null });

            migrationBuilder.InsertData(
                table: "Units",
                columns: new[] { "Id", "Bathrooms", "Bedrooms", "BuildingId", "FloorNumber", "Identifier", "IsActive", "SquareFeet" },
                values: new object[,]
                {
                    { new Guid("21f3d321-1a30-4b28-82f6-74a24a0e6f77"), 2, 3, new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), 1, "102", true, 1050 },
                    { new Guid("7a81ce9b-889e-4f50-8f0a-1c9ce0597a80"), 1, 2, new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), 1, "101", true, 850 }
                });

            migrationBuilder.InsertData(
                table: "Accounts",
                columns: new[] { "Id", "AccountNumber", "Balance", "BuildingId", "EndDate", "StartDate", "Status", "UnitId" },
                values: new object[] { new Guid("8b37db1c-3ee5-4754-9f0b-0a7b1d3aa1ef"), "MAIN-101-001", 150.00m, new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), null, new DateTime(2023, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Active", new Guid("7a81ce9b-889e-4f50-8f0a-1c9ce0597a80") });

            migrationBuilder.InsertData(
                table: "StaffRoles",
                columns: new[] { "RoleId", "StaffId", "BuildingId" },
                values: new object[] { new Guid("132f35a0-476e-4b0a-863d-72f4c2cd7e5b"), new Guid("63bb7e58-8c0f-4e7d-bb04-740a2eb3f901"), new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801") });

            migrationBuilder.InsertData(
                table: "Residents",
                columns: new[] { "Id", "AccountId", "BuildingId", "Email", "FirstName", "IsPrimary", "LastName", "MoveInDate", "MoveOutDate", "PhoneNumber" },
                values: new object[,]
                {
                    { new Guid("5963f7c1-65eb-4de4-b4da-1df64e68545e"), new Guid("8b37db1c-3ee5-4754-9f0b-0a7b1d3aa1ef"), new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), "jamie.rivera@example.com", "Jamie", true, "Rivera", new DateTime(2023, 1, 15, 0, 0, 0, 0, DateTimeKind.Utc), null, "+1-555-0101" },
                    { new Guid("e1808b68-75ad-4f14-8c1e-805d6e7a3f13"), new Guid("8b37db1c-3ee5-4754-9f0b-0a7b1d3aa1ef"), new Guid("2f2b1c4b-38c2-4f68-a54b-8c7fe1d6a801"), "alex.rivera@example.com", "Alex", false, "Rivera", new DateTime(2023, 1, 15, 0, 0, 0, 0, DateTimeKind.Utc), null, "+1-555-0102" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_BuildingId",
                table: "Accounts",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_BuildingId_AccountNumber",
                table: "Accounts",
                columns: new[] { "BuildingId", "AccountNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UnitId",
                table: "Accounts",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_BuildingId",
                table: "AuditLogs",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_BuildingId_PerformedAtUtc",
                table: "AuditLogs",
                columns: new[] { "BuildingId", "PerformedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Buildings_Code",
                table: "Buildings",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Buildings_CreatedAtUtc",
                table: "Buildings",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Name",
                table: "Permissions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Residents_AccountId",
                table: "Residents",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_BuildingId",
                table: "Residents",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_BuildingId_Email",
                table: "Residents",
                columns: new[] { "BuildingId", "Email" });

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Name",
                table: "Roles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Staff_BuildingId",
                table: "Staff",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_Staff_BuildingId_Email",
                table: "Staff",
                columns: new[] { "BuildingId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StaffRoles_BuildingId",
                table: "StaffRoles",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffRoles_RoleId",
                table: "StaffRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Units_BuildingId",
                table: "Units",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_Units_BuildingId_Identifier",
                table: "Units",
                columns: new[] { "BuildingId", "Identifier" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "Residents");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "StaffRoles");

            migrationBuilder.DropTable(
                name: "Accounts");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Staff");

            migrationBuilder.DropTable(
                name: "Units");

            migrationBuilder.DropTable(
                name: "Buildings");
        }
    }
}
