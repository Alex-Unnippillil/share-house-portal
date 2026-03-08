using IdentityService.Api.Data;
using IdentityService.Api.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace IdentityService.Tests.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<AppDbContext>));
            services.RemoveAll(typeof(AppDbContext));

            services.AddSingleton(provider =>
            {
                _connection ??= new SqliteConnection("Filename=:memory:");
                _connection.Open();
                return _connection;
            });

            services.AddDbContext<AppDbContext>((sp, options) =>
            {
                var connection = sp.GetRequiredService<SqliteConnection>();
                options.UseSqlite(connection);
            });

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            dbContext.Database.EnsureCreated();

            if (!dbContext.Users.Any())
            {
                var user = new User
                {
                    Email = "factory-admin@example.com",
                    DisplayName = "Factory Admin"
                };
                user.PasswordHash = passwordHasher.HashPassword(user, "FactoryPass!123");
                dbContext.Users.Add(user);
            }

            if (!dbContext.OAuthClients.Any())
            {
                dbContext.OAuthClients.Add(new OAuthClient
                {
                    ClientId = "test-client",
                    ClientSecret = "test-secret",
                    RedirectUri = "https://localhost/callback",
                    Name = "Test Client"
                });
            }

            dbContext.SaveChanges();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection?.Dispose();
            _connection = null;
        }
    }
}
