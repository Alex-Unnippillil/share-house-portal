#!/usr/bin/env node
/**
 * Minimal ELT orchestration harness that runs Great Expectations validations
 * after the transform step. Wire this script into CI/CD or scheduled jobs
 * to continuously assert data quality in the analytics warehouse.
 */
import { spawnSync } from "node:child_process";

const shouldSkip = process.env.SKIP_GX_VALIDATIONS === "true";
if (shouldSkip) {
  console.log("SKIP_GX_VALIDATIONS=true detected, skipping Great Expectations checkpoint");
  process.exit(0);
}

const pythonExecutable = process.env.PYTHON || "python3";
const checkpointName = process.env.GX_CHECKPOINT_NAME || "warehouse_pipeline";

console.log(`Running Great Expectations checkpoint '${checkpointName}' using ${pythonExecutable}`);

const gxArgs = ["analytics/gx/run_checkpoint.py", "--checkpoint", checkpointName];
const gxResult = spawnSync(pythonExecutable, gxArgs, { stdio: "inherit" });

if (gxResult.error) {
  console.error("Failed to execute Great Expectations runner", gxResult.error);
  process.exit(1);
}

if (gxResult.status !== 0) {
  console.error(`Great Expectations checkpoint '${checkpointName}' reported failures`);
  process.exit(gxResult.status ?? 1);
}

console.log("Great Expectations validation complete - proceeding with downstream ELT tasks");
