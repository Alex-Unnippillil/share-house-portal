# Data Quality Monitoring with Great Expectations

This project ships a [Great Expectations](https://greatexpectations.io/) data
context in `analytics/gx/` to continuously validate the analytics warehouse.
It focuses on the two highest-signal tables that power the Share House Portal
reporting surfaces: `rent_payments` and `amenity_bookings`.

## Project Layout

- `analytics/gx/great_expectations.yml` – Data context configuration targeting
the warehouse via the `WAREHOUSE_CONNECTION_STRING` environment variable.
- `analytics/gx/expectations/` – Expectation suites capturing schema, null
  thresholds, and business rules for each warehouse table.
- `analytics/gx/checkpoints/warehouse_pipeline.yml` – Checkpoint that materialises
  both suites as part of the ELT workflow.
- `analytics/gx/run_checkpoint.py` – Python entrypoint that runs checkpoints and
  raises webhook alerts on failure.
- `scripts/elt/run_pipeline.mjs` – Node harness that can be invoked by CI/CD or
  orchestration tools to run validations after the transform step.

## Installation

1. Create a Python environment (Python 3.10+) that sits alongside the Node
   tooling used by the web application.

   ```bash
   cd /workspace/share-house-portal
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r analytics/gx/requirements.txt
   ```

2. Provide a warehouse connection string compatible with SQLAlchemy. For Supabase
   Postgres deployments, the format is:

   ```bash
   export WAREHOUSE_CONNECTION_STRING="postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres"
   ```

3. (Optional) Configure an alerting webhook. When `ELT_ALERT_WEBHOOK_URL` is set
   Great Expectations failures trigger an HTTP POST containing a run summary.

   ```bash
   export ELT_ALERT_WEBHOOK_URL="https://hooks.slack.com/services/..."
   ```

## Running Validations

With dependencies installed and environment variables configured, execute the
checkpoint directly:

```bash
python analytics/gx/run_checkpoint.py --checkpoint warehouse_pipeline
```

The repository also exposes an npm script that can be scheduled in CI/CD:

```bash
pnpm elt:validate
```

Pass `GX_CHECKPOINT_NAME` to override the checkpoint name or `SKIP_GX_VALIDATIONS=true`
to bypass the step (useful for local iteration when the warehouse is unavailable).

## Alerting Strategy

- Alerts fire whenever a checkpoint returns a non-zero exit code. The payload
  includes the failed expectation type, kwargs, and observed values to accelerate
  triage.
- Webhook delivery errors are logged to stderr but do not mask the validation
  failure.
- Extend `run_checkpoint.py` if additional destinations (email, PagerDuty, etc.)
  are required.

## Extending the Suite

1. Author new expectations in `analytics/gx/expectations/` following the pattern
   demonstrated for existing tables.
2. Reference the suite from `analytics/gx/checkpoints/warehouse_pipeline.yml` or
   create a new checkpoint for isolated workflows.
3. Commit the expectation suite and rerun the validations in CI to ensure the
   new rules pass against production-like fixtures.
