using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ShareHousePortal.BackgroundWorker;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((context, services) =>
    {
        services.AddHostedService<Worker>();
    })
    .Build();

await host.RunAsync();
