using IdentityService.Api.Entities;

namespace IdentityService.Api.Services;

public interface IOAuthService
{
    Task<OAuthClient?> ValidateClientAsync(string clientId, string? clientSecret = null, CancellationToken cancellationToken = default);
    Task<AuthorizationCode> CreateAuthorizationCodeAsync(User user, OAuthClient client, string redirectUri, IEnumerable<string>? scopes, CancellationToken cancellationToken = default);
    Task<AuthorizationCode?> RedeemCodeAsync(string code, string redirectUri, CancellationToken cancellationToken = default);
}
