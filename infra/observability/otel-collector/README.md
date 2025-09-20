# OpenTelemetry Collector on EKS

The configuration in this directory deploys the OpenTelemetry Collector as a
highly-available `Deployment` in the `observability` namespace of the EKS
cluster. The collector exposes an OTLP (gRPC/HTTP) endpoint that the .NET
services use for tracing and metrics. Two values files are provided for the
supported vendor backends:

- `datadog-values.yaml` – forwards signals to the Datadog backend using the
  native Datadog exporter.
- `newrelic-values.yaml` – forwards signals to New Relic via the OTLP/HTTP
  exporter.

## Prerequisites

1. Provision an IAM role that allows the collector to access CloudWatch logs
   for diagnostics (if desired) and attach it to the service account referenced
   in the values files (`share-house-otel-collector`). Replace `<ACCOUNT_ID>`
   with your AWS account identifier.
2. Create the target namespace:

   ```bash
   kubectl create namespace observability
   ```

3. Store the vendor API keys as Kubernetes secrets:

   ```bash
   # Datadog
   kubectl -n observability create secret generic datadog-api-key \
     --from-literal=api-key="<DATADOG_API_KEY>"

   # New Relic
   kubectl -n observability create secret generic newrelic-license \
     --from-literal=key="<NEW_RELIC_LICENSE_KEY>"
   ```

4. Add the OpenTelemetry Helm repository:

   ```bash
   helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
   helm repo update
   ```

## Deploy

Install the collector with the values file that matches your backend:

```bash
# Datadog backend
helm upgrade --install share-house-otel-collector open-telemetry/opentelemetry-collector \
  --namespace observability \
  --values infra/observability/otel-collector/datadog-values.yaml

# New Relic backend
helm upgrade --install share-house-otel-collector open-telemetry/opentelemetry-collector \
  --namespace observability \
  --values infra/observability/otel-collector/newrelic-values.yaml
```

The collector service listens on `otel-collector.observability.svc.cluster.local`
port `4317` (gRPC) and `4318` (HTTP). The .NET instrumentation uses the gRPC
endpoint by default. The deployed collector also exposes its own metrics on
port `8888` which can be scraped by Prometheus if desired.

### Optional Add-ons

- **High availability** – Increase `replicaCount` to `3+` and add PodDisruption
  Budgets if your SLOs require higher resiliency.
- **Prometheus remote_write** – Add an exporter if you need to ship metrics to
  a Prometheus-compatible endpoint in addition to the SaaS backend.
- **Filter processors** – Add `attributes` or `spanmetrics` processors to mask
  PII or produce RED metrics server-side.

## Rollout validation

After deployment, verify that the collector is healthy:

```bash
kubectl -n observability get pods -l app.kubernetes.io/name=opentelemetry-collector
kubectl -n observability logs deploy/share-house-otel-collector
```

Then check that the .NET services can reach the collector:

```bash
kubectl -n <service-namespace> exec deploy/<service-name> -- \
  curl -v telnet://otel-collector.observability.svc.cluster.local:4317
```

If telemetry does not appear in Datadog or New Relic, confirm that the secrets
are mounted correctly and that the API keys are valid.
