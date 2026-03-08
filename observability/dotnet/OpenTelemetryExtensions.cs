using System;
using System.Collections.Generic;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OpenTelemetry.Extensions.Hosting;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Instrumentation.EventCounters;
using OpenTelemetry.Instrumentation.Http;
using OpenTelemetry.Instrumentation.SqlClient;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace ShareHousePortal.Observability;

/// <summary>
/// Provides helper methods for wiring OpenTelemetry tracing and metrics into
/// .NET services that run in the Share House platform. The configuration
/// mirrors the collector deployment on EKS and supports Datadog and New Relic
/// backends via OTLP.
/// </summary>
public static class OpenTelemetryExtensions
{
    private const string DefaultServiceNamespace = "share-house";

    /// <summary>
    /// Adds OpenTelemetry tracing and metrics using configuration under the
    /// <c>Observability:OpenTelemetry</c> section.
    /// </summary>
    /// <remarks>
    /// The extension wires ASP.NET Core, HTTP client, SQL client, and runtime
    /// instrumentation. Exporters are enabled for the EKS collector (OTLP gRPC)
    /// and optional console diagnostics for local development. Service
    /// metadata is hydrated from the configuration or from environment
    /// variables exposed by the Kubernetes deployment.</remarks>
    /// <param name="services">The dependency injection container.</param>
    /// <param name="configuration">Application configuration.</param>
    /// <param name="environment">Host environment used to infer metadata.</param>
    /// <returns>The modified <see cref="IServiceCollection"/>.</returns>
    public static IServiceCollection AddShareHouseOpenTelemetry(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var otelSection = configuration.GetSection("Observability:OpenTelemetry");

        var serviceName = otelSection.GetValue<string>("ServiceName")
            ?? environment.ApplicationName
            ?? "share-house-service";

        var serviceVersion = otelSection.GetValue<string>("ServiceVersion")
            ?? Assembly.GetEntryAssembly()?.GetName().Version?.ToString()
            ?? "1.0.0";

        var deploymentEnvironment = otelSection.GetValue<string>("DeploymentEnvironment")
            ?? environment.EnvironmentName
            ?? "production";

        var serviceNamespace = otelSection.GetValue<string>("ServiceNamespace")
            ?? DefaultServiceNamespace;

        var otlpEndpoint = otelSection.GetValue<string>("OtlpEndpoint")
            ?? Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT");

        var otlpHeaders = otelSection.GetValue<string>("OtlpHeaders")
            ?? Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_HEADERS");

        var enableConsoleExporter = otelSection.GetValue<bool?>("EnableConsoleExporter")
            ?? environment.IsDevelopment();

        services.AddOpenTelemetry()
            .ConfigureResource(resourceBuilder => resourceBuilder
                .AddService(
                    serviceName: serviceName,
                    serviceVersion: serviceVersion,
                    serviceInstanceId: Environment.MachineName)
                .AddAttributes(new Dictionary<string, object?>
                {
                    ["service.namespace"] = serviceNamespace,
                    ["deployment.environment"] = deploymentEnvironment,
                    ["cloud.provider"] = "aws",
                    ["cloud.platform"] = "aws_eks",
                    ["host.name"] = Environment.MachineName
                }))
            .WithTracing(tracerProviderBuilder =>
            {
                tracerProviderBuilder
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        options.RecordException = true;
                        options.EnrichWithHttpRequest = (activity, request) =>
                        {
                            activity.SetTag("http.request_content_length", request.ContentLength);
                        };
                        options.EnrichWithHttpResponse = (activity, response) =>
                        {
                            activity.SetTag("http.response_content_length", response.ContentLength);
                        };
                    })
                    .AddHttpClientInstrumentation(options =>
                    {
                        options.RecordException = true;
                    })
                    .AddSqlClientInstrumentation(options =>
                    {
                        options.SetDbStatementForText = true;
                        options.RecordException = true;
                    })
                    .AddSource("ShareHousePortal.*");

                if (enableConsoleExporter)
                {
                    tracerProviderBuilder.AddConsoleExporter();
                }

                if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                {
                    tracerProviderBuilder.AddOtlpExporter(otlpOptions =>
                    {
                        otlpOptions.Endpoint = new Uri(otlpEndpoint);
                        if (!string.IsNullOrWhiteSpace(otlpHeaders))
                        {
                            otlpOptions.Headers = otlpHeaders;
                        }
                    });
                }
            })
            .WithMetrics(meterProviderBuilder =>
            {
                meterProviderBuilder
                    .AddRuntimeInstrumentation()
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddEventCountersInstrumentation(options =>
                    {
                        options.AddEventSources(
                            "Microsoft.AspNetCore.Hosting",
                            "Microsoft-AspNetCore-Server-Kestrel",
                            "System.Net.Http",
                            "System.Runtime");
                    })
                    .AddMeter("ShareHousePortal.*");

                if (enableConsoleExporter)
                {
                    meterProviderBuilder.AddConsoleExporter();
                }

                if (!string.IsNullOrWhiteSpace(otlpEndpoint))
                {
                    meterProviderBuilder.AddOtlpExporter(otlpOptions =>
                    {
                        otlpOptions.Endpoint = new Uri(otlpEndpoint);
                        if (!string.IsNullOrWhiteSpace(otlpHeaders))
                        {
                            otlpOptions.Headers = otlpHeaders;
                        }
                    });
                }
            });

        services.Configure<OpenTelemetryLoggerOptions>(loggerOptions =>
        {
            loggerOptions.IncludeFormattedMessage = true;
            loggerOptions.IncludeScopes = true;
            loggerOptions.ParseStateValues = true;
        });

        return services;
    }
}
