using System;
using System.Threading.Tasks;
using Amazon;
using Amazon.CloudWatchLogs;
using Amazon.CloudWatchLogs.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using Serilog.Sinks.AwsCloudWatch;

namespace ShareHousePortal.Observability;

/// <summary>
/// Configures Serilog to publish structured JSON logs to Amazon CloudWatch
/// Logs with a deterministic log group naming convention and retention
/// policies. The configuration is read from the
/// <c>Observability:CloudWatch</c> section.
/// </summary>
public static class SerilogCloudWatchLogging
{
    /// <summary>
    /// Enriches the <see cref="LoggerConfiguration"/> with CloudWatch sinks
    /// and ensures that the target log group exists with the configured
    /// retention policy.
    /// </summary>
    public static LoggerConfiguration ConfigureShareHouseCloudWatch(
        this LoggerConfiguration loggerConfiguration,
        IConfiguration configuration,
        IHostEnvironment environment,
        IAmazonCloudWatchLogs? cloudWatchLogsClient = null)
    {
        var cloudWatchSection = configuration.GetSection("Observability:CloudWatch");

        var regionName = cloudWatchSection.GetValue<string>("Region")
            ?? Environment.GetEnvironmentVariable("AWS_REGION")
            ?? "us-east-1";

        var logGroupName = cloudWatchSection.GetValue<string>("LogGroup")
            ?? $"/{environment.EnvironmentName}/{environment.ApplicationName}";

        var streamPrefix = cloudWatchSection.GetValue<string>("LogStreamPrefix")
            ?? Environment.MachineName;

        var retentionInDays = cloudWatchSection.GetValue<int?>("RetentionInDays");

        var flushPeriodSeconds = cloudWatchSection.GetValue<int?>("FlushPeriodSeconds") ?? 5;
        var batchSizeLimit = cloudWatchSection.GetValue<int?>("BatchSizeLimit") ?? 100;
        var queueSizeLimit = cloudWatchSection.GetValue<int?>("QueueSizeLimit") ?? 10_000;
        var minimumLevel = cloudWatchSection.GetValue<LogEventLevel?>("MinimumLevel")
            ?? LogEventLevel.Information;

        cloudWatchLogsClient ??= new AmazonCloudWatchLogsClient(RegionEndpoint.GetBySystemName(regionName));

        EnsureLogGroupAsync(cloudWatchLogsClient, logGroupName, retentionInDays).GetAwaiter().GetResult();

        var sinkOptions = new CloudWatchSinkOptions
        {
            LogGroupName = logGroupName,
            LogStreamNamePrefix = streamPrefix,
            TextFormatter = new RenderedCompactJsonFormatter(),
            BatchSizeLimit = batchSizeLimit,
            QueueSizeLimit = queueSizeLimit,
            Period = TimeSpan.FromSeconds(flushPeriodSeconds),
            CreateLogGroup = false
        };

        return loggerConfiguration
            .MinimumLevel.Is(minimumLevel)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("service.name", environment.ApplicationName)
            .Enrich.WithProperty("deployment.environment", environment.EnvironmentName)
            .WriteTo.AmazonCloudWatch(sinkOptions, cloudWatchLogsClient)
            .WriteTo.Console(new RenderedCompactJsonFormatter());
    }

    private static async Task EnsureLogGroupAsync(
        IAmazonCloudWatchLogs cloudWatchLogs,
        string logGroupName,
        int? retentionInDays)
    {
        try
        {
            await cloudWatchLogs.CreateLogGroupAsync(new CreateLogGroupRequest
            {
                LogGroupName = logGroupName
            });
        }
        catch (ResourceAlreadyExistsException)
        {
            // Log group already exists – nothing to do.
        }

        if (retentionInDays.HasValue)
        {
            await cloudWatchLogs.PutRetentionPolicyAsync(new PutRetentionPolicyRequest
            {
                LogGroupName = logGroupName,
                RetentionInDays = retentionInDays.Value
            });
        }
    }
}
