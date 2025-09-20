using IdentityService.Api.Data;
using IdentityService.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace IdentityService.Api.Extensions;

public static class HostExtensions
{
    public static async Task<IHost> ApplyMigrationsAsync(this IHost host)
    {
        using var scope = host.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.EnsureCreatedAsync();

        if (!await dbContext.OAuthClients.AnyAsync())
        {
            var defaultClient = new OAuthClient
            {
                ClientId = "sharehouse-web",
                ClientSecret = "change-me",
                RedirectUri = "https://localhost:3000/auth/callback",
                Name = "ShareHouse Web"
            };
            dbContext.OAuthClients.Add(defaultClient);
        }

        if (!await dbContext.Users.AnyAsync())
        {
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            var user = new User
            {
                Email = "admin@sharehouse.local",
                DisplayName = "ShareHouse Admin"
            };
            user.PasswordHash = passwordHasher.HashPassword(user, "ChangeMe!123");
            dbContext.Users.Add(user);
        }

        await dbContext.SaveChangesAsync();
        return host;
    }
}
