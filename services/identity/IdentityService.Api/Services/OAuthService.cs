using IdentityService.Api.Data;
using IdentityService.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Services;

public class OAuthService : IOAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<OAuthService> _logger;

    public OAuthService(AppDbContext dbContext, ILogger<OAuthService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<OAuthClient?> ValidateClientAsync(string clientId, string? clientSecret = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(clientId))
        {
            return null;
        }

        var client = await _dbContext.OAuthClients.SingleOrDefaultAsync(c => c.ClientId == clientId, cancellationToken);
        if (client is null)
        {
            _logger.LogWarning("OAuth client {ClientId} not found", clientId);
            return null;
        }

        if (clientSecret is not null && client.ClientSecret != clientSecret)
        {
            _logger.LogWarning("OAuth client {ClientId} provided invalid secret", clientId);
            return null;
        }

        return client;
    }

    public async Task<AuthorizationCode> CreateAuthorizationCodeAsync(User user, OAuthClient client, string redirectUri, IEnumerable<string>? scopes, CancellationToken cancellationToken = default)
    {
        var code = new AuthorizationCode
        {
            Code = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            UserId = user.Id,
            OAuthClientId = client.Id,
            RedirectUri = redirectUri,
            Scopes = scopes is null ? null : string.Join(' ', scopes),
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        };

        await _dbContext.AuthorizationCodes.AddAsync(code, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Created authorization code for client {ClientId} and user {UserId}", client.ClientId, user.Id);
        return code;
    }

    public async Task<AuthorizationCode?> RedeemCodeAsync(string code, string redirectUri, CancellationToken cancellationToken = default)
    {
        var authorizationCode = await _dbContext.AuthorizationCodes
            .Include(c => c.User)
            .Include(c => c.Client)
            .SingleOrDefaultAsync(c => c.Code == code, cancellationToken);

        if (authorizationCode is null)
        {
            return null;
        }

        if (authorizationCode.Consumed || authorizationCode.ExpiresAt < DateTime.UtcNow)
        {
            return null;
        }

        if (!string.Equals(authorizationCode.RedirectUri, redirectUri, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        authorizationCode.Consumed = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return authorizationCode;
    }
}
