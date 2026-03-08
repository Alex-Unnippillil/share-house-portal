using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using IdentityService.Api.Entities;
using IdentityService.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace IdentityService.Api.Services;

public class TokenService : ITokenService
{
    private readonly JwtOptions _options;
    private readonly ILogger<TokenService> _logger;
    private readonly SigningCredentials _signingCredentials;

    public TokenService(IOptions<JwtOptions> options, ILogger<TokenService> logger)
    {
        _options = options.Value;
        _logger = logger;
        var keyBytes = Encoding.UTF8.GetBytes(_options.SigningKey);
        _signingCredentials = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);
    }

    public (string accessToken, DateTime expiresAt) CreateAccessToken(User user, IEnumerable<string>? scopes = null)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
        };

        if (!string.IsNullOrWhiteSpace(user.DisplayName))
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Name, user.DisplayName!));
        }

        if (scopes is not null)
        {
            claims.Add(new Claim("scope", string.Join(' ', scopes)));
        }

        if (user.MfaEnabled)
        {
            claims.Add(new Claim("mfa", "true"));
        }

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: _signingCredentials);

        var handler = new JwtSecurityTokenHandler();
        var accessToken = handler.WriteToken(token);
        return (accessToken, expiresAt);
    }

    public RefreshToken CreateRefreshToken(User user)
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(64);
        var refreshToken = new RefreshToken
        {
            Token = Convert.ToBase64String(tokenBytes),
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
            UserId = user.Id
        };

        _logger.LogDebug("Created refresh token for user {UserId}", user.Id);
        return refreshToken;
    }

    public string CreateIdToken(User user, IEnumerable<Claim>? additionalClaims = null)
    {
        var handler = new JwtSecurityTokenHandler();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.AuthTime, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
        };

        if (!string.IsNullOrEmpty(user.DisplayName))
        {
            claims.Add(new Claim("name", user.DisplayName!));
        }

        if (additionalClaims is not null)
        {
            claims.AddRange(additionalClaims);
        }

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes),
            signingCredentials: _signingCredentials);
        return handler.WriteToken(token);
    }
}
