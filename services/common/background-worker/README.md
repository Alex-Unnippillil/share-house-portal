# Background Worker

This project scaffolds a .NET background worker that can be extended to consume the platform's messaging events.

## Getting Started

1. Ensure the [.NET SDK 8.0](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) is installed locally.
2. Restore dependencies and run the worker:

   ```bash
   dotnet restore
   dotnet run
   ```

The worker currently logs a heartbeat every five seconds and is ready for future integration with the messaging resources defined in Terraform.
