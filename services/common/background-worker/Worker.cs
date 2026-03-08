using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ShareHousePortal.BackgroundWorker;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;

    public Worker(ILogger<Worker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ShareHousePortal background worker starting up");

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Worker heartbeat at: {time}", DateTimeOffset.UtcNow);

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }

        _logger.LogInformation("ShareHousePortal background worker is stopping");
    }
}
