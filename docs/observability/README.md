# Observability Overview

This guide explains how Share House backend services adopt the new
observability stack:

1. .NET services emit traces and metrics via OpenTelemetry and ship them to the
   OpenTelemetry Collector running in the EKS cluster.
2. Structured JSON logs flow to Amazon CloudWatch with retention policies and
   log-derived alerts.
3. Dashboards and alert definitions are tracked as documentation under this
   directory.

## .NET service changes

### OpenTelemetry instrumentation

The helper extension `AddShareHouseOpenTelemetry` wires up tracing and metrics.
Add the following to `Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddShareHouseOpenTelemetry(
    builder.Configuration,
    builder.Environment);
```

Load the provided settings file to supply service metadata and the collector
endpoint:

```csharp
builder.Configuration.AddJsonFile("appsettings.Observability.json", optional: true);
```

The extension enables ASP.NET Core, `HttpClient`, SQL client, runtime and event
counter instrumentation. It exports telemetry to the cluster collector over
OTLP/gRPC and enriches resources with environment metadata that is used by the
Datadog or New Relic backends.

Key configuration options (see
[`observability/dotnet/appsettings.Observability.json`](../../observability/dotnet/appsettings.Observability.json)):

- `Observability:OpenTelemetry:OtlpEndpoint` – internal service DNS for the
  collector (`otel-collector.observability.svc.cluster.local:4317`).
- `Observability:OpenTelemetry:OtlpHeaders` – API key headers. Set either the
  Datadog key (`DD-API-KEY`) or the New Relic license key (`api-key`).
- `Observability:OpenTelemetry:EnableConsoleExporter` – toggle console exporters
  for local development diagnostics.

### Structured logging

Serilog is used for structured JSON logging and for shipping logs directly to
CloudWatch. Configure the logger during host bootstrap:

```csharp
using Serilog;
using ShareHousePortal.Observability;

Log.Logger = new LoggerConfiguration()
    .ConfigureShareHouseCloudWatch(builder.Configuration, builder.Environment)
    .CreateLogger();

builder.Host.UseSerilog();
```

The extension ensures that the target log group exists, applies the configured
retention policy, and emits logs in a compact JSON format with consistent
properties (`service.name`, `deployment.environment`, request metrics, etc.).

Recommended configuration values (see
[`SerilogCloudWatchLogging.cs`](../../observability/dotnet/SerilogCloudWatchLogging.cs)):

- `Observability:CloudWatch:Region` – AWS region for log storage.
- `Observability:CloudWatch:LogGroup` – e.g. `/eks/share-house/api`.
- `Observability:CloudWatch:RetentionInDays` – default `30`.
- `Observability:CloudWatch:MinimumLevel` – default `Information`; consider
  `Warning` for noisy workloads.

## Collector deployment

Deploy the OpenTelemetry Collector using the Helm values files under
[`infra/observability/otel-collector`](../../infra/observability/otel-collector).
Choose the variant that matches your backend (Datadog or New Relic). The
collector accepts OTLP traffic from application pods and forwards it to the
vendor SaaS using API keys stored in Kubernetes secrets.

## CloudWatch alerts

The Terraform module in
[`infra/observability/cloudwatch`](../../infra/observability/cloudwatch)
provisions the log group, retention policy, log metric filters, and CloudWatch
alarms. Run the module once per environment to ensure all services share the
same log destination and alerting rules.

## Next steps

- Roll out the .NET code changes across all services and verify telemetry in the
  vendor dashboards.
- Connect CloudWatch alarms to an SNS topic that integrates with PagerDuty or
  Slack.
- Review the dashboard and alert documentation in this directory for the
  canonical monitoring views and SLO guardrails.
