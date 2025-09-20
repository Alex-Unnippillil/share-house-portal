CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;

CREATE TABLE "Buildings" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Buildings" PRIMARY KEY,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "AddressLine1" TEXT NULL,
    "AddressLine2" TEXT NULL,
    "City" TEXT NULL,
    "State" TEXT NULL,
    "PostalCode" TEXT NULL,
    "CreatedAtUtc" TEXT NOT NULL
);

CREATE TABLE "Permissions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Permissions" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Description" TEXT NULL
);

CREATE TABLE "Roles" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Roles" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Description" TEXT NULL
);

CREATE TABLE "AuditLogs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AuditLogs" PRIMARY KEY,
    "BuildingId" TEXT NOT NULL,
    "EntityName" TEXT NOT NULL,
    "EntityId" TEXT NOT NULL,
    "Action" TEXT NOT NULL,
    "Changes" TEXT NOT NULL,
    "PerformedBy" TEXT NOT NULL,
    "PerformedAtUtc" TEXT NOT NULL,
    "CorrelationId" TEXT NULL,
    CONSTRAINT "FK_AuditLogs_Buildings_BuildingId" FOREIGN KEY ("BuildingId") REFERENCES "Buildings" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Staff" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Staff" PRIMARY KEY,
    "BuildingId" TEXT NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PhoneNumber" TEXT NULL,
    "HireDate" TEXT NOT NULL,
    "TerminationDate" TEXT NULL,
    CONSTRAINT "FK_Staff_Buildings_BuildingId" FOREIGN KEY ("BuildingId") REFERENCES "Buildings" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Units" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Units" PRIMARY KEY,
    "BuildingId" TEXT NOT NULL,
    "Identifier" TEXT NOT NULL,
    "FloorNumber" INTEGER NULL,
    "Bedrooms" INTEGER NOT NULL DEFAULT 1,
    "Bathrooms" INTEGER NOT NULL DEFAULT 1,
    "SquareFeet" INTEGER NOT NULL DEFAULT 500,
    "IsActive" INTEGER NOT NULL,
    CONSTRAINT "FK_Units_Buildings_BuildingId" FOREIGN KEY ("BuildingId") REFERENCES "Buildings" ("Id") ON DELETE CASCADE
);

CREATE TABLE "RolePermissions" (
    "RoleId" TEXT NOT NULL,
    "PermissionId" TEXT NOT NULL,
    CONSTRAINT "PK_RolePermissions" PRIMARY KEY ("RoleId", "PermissionId"),
    CONSTRAINT "FK_RolePermissions_Permissions_PermissionId" FOREIGN KEY ("PermissionId") REFERENCES "Permissions" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RolePermissions_Roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE
);

CREATE TABLE "StaffRoles" (
    "StaffId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,
    "BuildingId" TEXT NOT NULL,
    CONSTRAINT "PK_StaffRoles" PRIMARY KEY ("StaffId", "RoleId"),
    CONSTRAINT "FK_StaffRoles_Buildings_BuildingId" FOREIGN KEY ("BuildingId") REFERENCES "Buildings" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_StaffRoles_Roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_StaffRoles_Staff_StaffId" FOREIGN KEY ("StaffId") REFERENCES "Staff" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Accounts" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Accounts" PRIMARY KEY,
    "BuildingId" TEXT NOT NULL,
    "UnitId" TEXT NOT NULL,
    "AccountNumber" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "StartDate" TEXT NOT NULL,
    "EndDate" TEXT NULL,
    "Balance" decimal(18,2) NOT NULL,
    CONSTRAINT "FK_Accounts_Buildings_BuildingId" FOREIGN KEY ("BuildingId") REFERENCES "Buildings" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Accounts_Units_UnitId" FOREIGN KEY ("UnitId") REFERENCES "Units" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Residents" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Residents" PRIMARY KEY,
    "BuildingId" TEXT NOT NULL,
    "AccountId" TEXT NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT NOT NULL,
    "Email" TEXT NULL,
    "PhoneNumber" TEXT NULL,
    "IsPrimary" INTEGER NOT NULL,
    "MoveInDate" TEXT NOT NULL,
    "MoveOutDate" TEXT NULL,
    CONSTRAINT "FK_Residents_Accounts_AccountId" FOREIGN KEY ("AccountId") REFERENCES "Accounts" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Residents_Buildings_BuildingId" FOREIGN KEY ("BuildingId") REFERENCES "Buildings" ("Id") ON DELETE RESTRICT
);

INSERT INTO "Buildings" ("Id", "AddressLine1", "AddressLine2", "City", "Code", "CreatedAtUtc", "Name", "PostalCode", "State")
VALUES ('2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', '123 Main Street', NULL, 'Metropolis', 'MAIN', '2020-01-01 00:00:00', 'Main Street Building', '10001', 'NY');
SELECT changes();


INSERT INTO "Permissions" ("Id", "Description", "Name")
VALUES ('332F15D0-06C7-4FFA-8A19-0A6C8B3D7A71', 'Maintain resident rosters and contact information', 'ManageResidents');
SELECT changes();

INSERT INTO "Permissions" ("Id", "Description", "Name")
VALUES ('927153EE-6355-4C24-8873-5014A4F14F7C', 'Create, update, and archive tenant accounts', 'ManageAccounts');
SELECT changes();

INSERT INTO "Permissions" ("Id", "Description", "Name")
VALUES ('9D61AC16-9DBA-4A98-91DF-46E4B2A938C9', 'Access and review audit log history', 'ViewAuditTrail');
SELECT changes();


INSERT INTO "Roles" ("Id", "Description", "Name")
VALUES ('132F35A0-476E-4B0A-863D-72F4C2CD7E5B', 'Oversees building operations and tenant lifecycle', 'PropertyManager');
SELECT changes();

INSERT INTO "Roles" ("Id", "Description", "Name")
VALUES ('8F7C7C87-5457-4F2D-8803-144612E3A59A', 'Handles maintenance requests and building upkeep', 'Maintenance');
SELECT changes();

INSERT INTO "Roles" ("Id", "Description", "Name")
VALUES ('FF5C4EE4-A6F5-4E01-8AC8-11AC5F2DFC25', 'Manages leasing workflows and resident onboarding', 'LeasingAgent');
SELECT changes();


INSERT INTO "AuditLogs" ("Id", "Action", "BuildingId", "Changes", "CorrelationId", "EntityId", "EntityName", "PerformedAtUtc", "PerformedBy")
VALUES ('61F59F0E-D904-42EA-86EB-132CD550CCAA', 'Seed', '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', '{"AccountCreated":true}', 'seed-boot', '8B37DB1C-3EE5-4754-9F0B-0A7B1D3AA1EF', 'Account', '2023-01-01 00:00:00', 'system-seed');
SELECT changes();


INSERT INTO "RolePermissions" ("PermissionId", "RoleId")
VALUES ('332F15D0-06C7-4FFA-8A19-0A6C8B3D7A71', '132F35A0-476E-4B0A-863D-72F4C2CD7E5B');
SELECT changes();

INSERT INTO "RolePermissions" ("PermissionId", "RoleId")
VALUES ('927153EE-6355-4C24-8873-5014A4F14F7C', '132F35A0-476E-4B0A-863D-72F4C2CD7E5B');
SELECT changes();

INSERT INTO "RolePermissions" ("PermissionId", "RoleId")
VALUES ('9D61AC16-9DBA-4A98-91DF-46E4B2A938C9', '132F35A0-476E-4B0A-863D-72F4C2CD7E5B');
SELECT changes();

INSERT INTO "RolePermissions" ("PermissionId", "RoleId")
VALUES ('332F15D0-06C7-4FFA-8A19-0A6C8B3D7A71', '8F7C7C87-5457-4F2D-8803-144612E3A59A');
SELECT changes();

INSERT INTO "RolePermissions" ("PermissionId", "RoleId")
VALUES ('332F15D0-06C7-4FFA-8A19-0A6C8B3D7A71', 'FF5C4EE4-A6F5-4E01-8AC8-11AC5F2DFC25');
SELECT changes();

INSERT INTO "RolePermissions" ("PermissionId", "RoleId")
VALUES ('927153EE-6355-4C24-8873-5014A4F14F7C', 'FF5C4EE4-A6F5-4E01-8AC8-11AC5F2DFC25');
SELECT changes();


INSERT INTO "Staff" ("Id", "BuildingId", "Email", "FirstName", "HireDate", "LastName", "PhoneNumber", "TerminationDate")
VALUES ('63BB7E58-8C0F-4E7D-BB04-740A2EB3F901', '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', 'morgan.lee@example.com', 'Morgan', '2020-06-15 00:00:00', 'Lee', '+1-555-0201', NULL);
SELECT changes();


INSERT INTO "Units" ("Id", "Bathrooms", "Bedrooms", "BuildingId", "FloorNumber", "Identifier", "IsActive", "SquareFeet")
VALUES ('21F3D321-1A30-4B28-82F6-74A24A0E6F77', 2, 3, '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', 1, '102', 1, 1050);
SELECT changes();

INSERT INTO "Units" ("Id", "Bathrooms", "Bedrooms", "BuildingId", "FloorNumber", "Identifier", "IsActive", "SquareFeet")
VALUES ('7A81CE9B-889E-4F50-8F0A-1C9CE0597A80', 1, 2, '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', 1, '101', 1, 850);
SELECT changes();


INSERT INTO "Accounts" ("Id", "AccountNumber", "Balance", "BuildingId", "EndDate", "StartDate", "Status", "UnitId")
VALUES ('8B37DB1C-3EE5-4754-9F0B-0A7B1D3AA1EF', 'MAIN-101-001', '150.0', '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', NULL, '2023-01-01 00:00:00', 'Active', '7A81CE9B-889E-4F50-8F0A-1C9CE0597A80');
SELECT changes();


INSERT INTO "StaffRoles" ("RoleId", "StaffId", "BuildingId")
VALUES ('132F35A0-476E-4B0A-863D-72F4C2CD7E5B', '63BB7E58-8C0F-4E7D-BB04-740A2EB3F901', '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801');
SELECT changes();


INSERT INTO "Residents" ("Id", "AccountId", "BuildingId", "Email", "FirstName", "IsPrimary", "LastName", "MoveInDate", "MoveOutDate", "PhoneNumber")
VALUES ('5963F7C1-65EB-4DE4-B4DA-1DF64E68545E', '8B37DB1C-3EE5-4754-9F0B-0A7B1D3AA1EF', '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', 'jamie.rivera@example.com', 'Jamie', 1, 'Rivera', '2023-01-15 00:00:00', NULL, '+1-555-0101');
SELECT changes();

INSERT INTO "Residents" ("Id", "AccountId", "BuildingId", "Email", "FirstName", "IsPrimary", "LastName", "MoveInDate", "MoveOutDate", "PhoneNumber")
VALUES ('E1808B68-75AD-4F14-8C1E-805D6E7A3F13', '8B37DB1C-3EE5-4754-9F0B-0A7B1D3AA1EF', '2F2B1C4B-38C2-4F68-A54B-8C7FE1D6A801', 'alex.rivera@example.com', 'Alex', 0, 'Rivera', '2023-01-15 00:00:00', NULL, '+1-555-0102');
SELECT changes();


CREATE INDEX "IX_Accounts_BuildingId" ON "Accounts" ("BuildingId");

CREATE UNIQUE INDEX "IX_Accounts_BuildingId_AccountNumber" ON "Accounts" ("BuildingId", "AccountNumber");

CREATE INDEX "IX_Accounts_UnitId" ON "Accounts" ("UnitId");

CREATE INDEX "IX_AuditLogs_BuildingId" ON "AuditLogs" ("BuildingId");

CREATE INDEX "IX_AuditLogs_BuildingId_PerformedAtUtc" ON "AuditLogs" ("BuildingId", "PerformedAtUtc");

CREATE UNIQUE INDEX "IX_Buildings_Code" ON "Buildings" ("Code");

CREATE INDEX "IX_Buildings_CreatedAtUtc" ON "Buildings" ("CreatedAtUtc");

CREATE UNIQUE INDEX "IX_Permissions_Name" ON "Permissions" ("Name");

CREATE INDEX "IX_Residents_AccountId" ON "Residents" ("AccountId");

CREATE INDEX "IX_Residents_BuildingId" ON "Residents" ("BuildingId");

CREATE INDEX "IX_Residents_BuildingId_Email" ON "Residents" ("BuildingId", "Email");

CREATE INDEX "IX_RolePermissions_PermissionId" ON "RolePermissions" ("PermissionId");

CREATE UNIQUE INDEX "IX_Roles_Name" ON "Roles" ("Name");

CREATE INDEX "IX_Staff_BuildingId" ON "Staff" ("BuildingId");

CREATE UNIQUE INDEX "IX_Staff_BuildingId_Email" ON "Staff" ("BuildingId", "Email");

CREATE INDEX "IX_StaffRoles_BuildingId" ON "StaffRoles" ("BuildingId");

CREATE INDEX "IX_StaffRoles_RoleId" ON "StaffRoles" ("RoleId");

CREATE INDEX "IX_Units_BuildingId" ON "Units" ("BuildingId");

CREATE UNIQUE INDEX "IX_Units_BuildingId_Identifier" ON "Units" ("BuildingId", "Identifier");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20250920182315_InitialCreate', '8.0.5');

COMMIT;

