import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20250410_member_auto_provision.sql",
);

const migrationSQL = readFileSync(migrationPath, "utf-8");

describe("member auto-provisioning migration", () => {
  it("defines the provisioning function", () => {
    expect(migrationSQL).toMatch(
      /create or replace function public\.provision_member_for_auth_user\(\)/i,
    );
    expect(migrationSQL).toMatch(/returns trigger/i);
  });

  it("inserts members with a default tenant role", () => {
    expect(migrationSQL).toMatch(
      /insert\s+into\s+public\.members\s*\(\s*user_id,\s*role\s*\)\s*values\s*\(/i,
    );
    expect(migrationSQL).toMatch(/'tenant'/i);
  });

  it("guards against duplicate provisioning attempts", () => {
    expect(migrationSQL).toMatch(
      /if\s+exists\s*\(\s*select\s+1\s+from\s+public\.members\s+m\s+where\s+m\.user_id\s*=\s*_user_id\s*\)/i,
    );
    expect(migrationSQL).toMatch(/on\s+conflict\s*\(\s*user_id\s*\)\s*do\s+nothing/i);
  });

  it("logs failures for observability", () => {
    expect(migrationSQL).toMatch(/raise\s+log\s+'public\.provision_member_for_auth_user error/i);
  });

  it("registers the auth.users trigger", () => {
    expect(migrationSQL).toMatch(
      /create\s+trigger\s+provision_member_on_auth_user\s+after\s+insert\s+on\s+auth\.users/i,
    );
  });
});
