#!/usr/bin/env python3
"""Utility entrypoint for running Great Expectations checkpoints.

This script is intended to be invoked as part of the ELT workflow to
validate warehouse tables and raise alerts when data quality checks fail.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

try:
    import requests
except ImportError:  # pragma: no cover - optional dependency
    requests = None  # type: ignore[assignment]

try:
    import great_expectations as gx
except ImportError as exc:  # pragma: no cover - runtime guard
    raise SystemExit("Great Expectations must be installed to run validations") from exc


LOGGER = logging.getLogger("gx_runner")


def _get_context() -> gx.DataContext:
    context_root = Path(__file__).resolve().parent
    return gx.get_context(context_root_dir=str(context_root))


def _extract_failures(run_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse checkpoint run results and return a lightweight failure summary."""
    failures: List[Dict[str, Any]] = []
    for result in run_results.values():
        validation = result.get("validation_result")
        if not validation:
            continue
        suite_name = validation.get("meta", {}).get("expectation_suite_name")
        for expectation in validation.get("results", []):
            if expectation.get("success") is not False:
                continue
            config = expectation.get("expectation_config", {})
            failures.append(
                {
                    "suite": suite_name,
                    "expectation_type": config.get("expectation_type"),
                    "kwargs": config.get("kwargs", {}),
                    "observed_value": expectation.get("result"),
                }
            )
    return failures


def _post_alert(message: str, payload: Dict[str, Any]) -> None:
    webhook = os.getenv("ELT_ALERT_WEBHOOK_URL")
    if not webhook:
        LOGGER.warning("No ELT_ALERT_WEBHOOK_URL configured; skipping alert webhook")
        return
    if requests is None:
        LOGGER.warning("requests library is not available; skipping alert webhook")
        return
    try:
        response = requests.post(
            webhook,
            headers={"Content-Type": "application/json"},
            data=json.dumps({"text": message, "payload": payload}),
            timeout=10,
        )
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - defensive logging
        LOGGER.error("Failed to dispatch alert webhook: %s", exc)


def run_checkpoint(checkpoint_name: str) -> int:
    context = _get_context()
    LOGGER.info("Running Great Expectations checkpoint: %s", checkpoint_name)
    result = context.run_checkpoint(checkpoint_name=checkpoint_name)

    success: bool
    run_results: Dict[str, Any]
    if hasattr(result, "success"):
        success = bool(result.success)
        run_results = getattr(result, "run_results", {})
    else:  # Fallback to dictionary-like API
        success = bool(result.get("success"))  # type: ignore[arg-type]
        run_results = result.get("run_results", {})  # type: ignore[assignment]

    failures = _extract_failures(run_results)
    summary = {
        "checkpoint": checkpoint_name,
        "success": success,
        "run_time_utc": datetime.utcnow().isoformat() + "Z",
        "failed_expectations": failures,
    }

    print(json.dumps(summary, indent=2))

    if not success:
        message = f"Great Expectations checkpoint '{checkpoint_name}' failed"
        _post_alert(message, summary)
        return 1

    LOGGER.info("Checkpoint %s succeeded", checkpoint_name)
    return 0


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a Great Expectations checkpoint")
    parser.add_argument(
        "--checkpoint",
        default="warehouse_pipeline",
        help="Checkpoint name to run (default: warehouse_pipeline)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"],
        help="Set the logging level for script diagnostics",
    )
    return parser.parse_args(argv)



def main(argv: List[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    logging.basicConfig(level=getattr(logging, args.log_level.upper()))
    return run_checkpoint(args.checkpoint)


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
