using System.Security.Claims;
using IdentityService.Api.Entities;
using IdentityService.Api.Models;

namespace IdentityService.Api.Services;

public interface ITokenService
{
    (string accessToken, DateTime expiresAt) CreateAccessToken(User user, IEnumerable<string>? scopes = null);
    RefreshToken CreateRefreshToken(User user);
    string CreateIdToken(User user, IEnumerable<Claim>? additionalClaims = null);
}
