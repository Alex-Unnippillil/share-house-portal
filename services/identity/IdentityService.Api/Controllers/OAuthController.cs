using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using IdentityService.Api.Data;
using IdentityService.Api.Dtos;
using IdentityService.Api.Entities;
using IdentityService.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Controllers;

[ApiController]
[Route("oauth")]
public class OAuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IOAuthService _oauthService;
    private readonly ITokenService _tokenService;
    private readonly ILogger<OAuthController> _logger;

    public OAuthController(AppDbContext dbContext, IOAuthService oauthService, ITokenService tokenService, ILogger<OAuthController> logger)
    {
        _dbContext = dbContext;
        _oauthService = oauthService;
        _tokenService = tokenService;
        _logger = logger;
    }

    [Authorize]
    [HttpGet("authorize")]
    [ProducesResponseType(typeof(OAuthAuthorizationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Authorize(
        [FromQuery(Name = "response_type")] string responseType,
        [FromQuery(Name = "client_id")] string clientId,
        [FromQuery(Name = "redirect_uri")] string redirectUri,
        [FromQuery] string? scope,
        [FromQuery] string? state,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(responseType, "code", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "unsupported_response_type" });
        }

        var client = await _oauthService.ValidateClientAsync(clientId, cancellationToken: cancellationToken);
        if (client is null)
        {
            return BadRequest(new { error = "invalid_client" });
        }

        if (!string.Equals(client.RedirectUri, redirectUri, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "invalid_redirect_uri" });
        }

        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        var scopes = scope?.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var authorizationCode = await _oauthService.CreateAuthorizationCodeAsync(user, client, redirectUri, scopes, cancellationToken);
        _logger.LogInformation("Issued authorization code for client {ClientId} and user {UserId}", client.ClientId, user.Id);

        return Ok(new OAuthAuthorizationResponse
        {
            Code = authorizationCode.Code,
            RedirectUri = redirectUri,
            State = state,
            ExpiresAt = authorizationCode.ExpiresAt
        });
    }

    [HttpPost("token")]
    [ProducesResponseType(typeof(OAuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Token([FromForm] OAuthTokenRequest request, CancellationToken cancellationToken)
    {
        switch (request.GrantType)
        {
            case "authorization_code":
                return await ExchangeAuthorizationCodeAsync(request, cancellationToken);
            case "refresh_token":
                return await ExchangeRefreshTokenAsync(request, cancellationToken);
            default:
                return BadRequest(new { error = "unsupported_grant_type" });
        }
    }

    [Authorize]
    [HttpGet("userinfo")]
    public async Task<IActionResult> UserInfo(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new
        {
            sub = user.Id,
            name = user.DisplayName,
            email = user.Email,
            mfa_enabled = user.MfaEnabled
        });
    }

    private async Task<IActionResult> ExchangeAuthorizationCodeAsync(OAuthTokenRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ClientId) || string.IsNullOrWhiteSpace(request.ClientSecret) ||
            string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.RedirectUri))
        {
            return BadRequest(new { error = "invalid_request" });
        }

        var client = await _oauthService.ValidateClientAsync(request.ClientId, request.ClientSecret, cancellationToken);
        if (client is null)
        {
            return BadRequest(new { error = "invalid_client" });
        }

        var authorizationCode = await _oauthService.RedeemCodeAsync(request.Code, request.RedirectUri, cancellationToken);
        if (authorizationCode is null)
        {
            return BadRequest(new { error = "invalid_grant" });
        }

        var user = authorizationCode.User ?? await _dbContext.Users.FindAsync(new object?[] { authorizationCode.UserId }, cancellationToken);
        if (user is null)
        {
            return BadRequest(new { error = "invalid_grant" });
        }

        var scopes = authorizationCode.Scopes?.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var (accessToken, expiresAt) = _tokenService.CreateAccessToken(user, scopes);
        var refreshToken = _tokenService.CreateRefreshToken(user);
        user.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var idTokenClaims = new List<Claim>
        {
            new("nonce", Guid.NewGuid().ToString())
        };
        var idToken = _tokenService.CreateIdToken(user, idTokenClaims);

        _logger.LogInformation("Issued tokens for client {ClientId} and user {UserId}", client.ClientId, user.Id);

        return Ok(new OAuthTokenResponse
        {
            AccessToken = accessToken,
            ExpiresIn = (int)(expiresAt - DateTime.UtcNow).TotalSeconds,
            RefreshToken = refreshToken.Token,
            IdToken = idToken
        });
    }

    private async Task<IActionResult> ExchangeRefreshTokenAsync(OAuthTokenRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ClientId) || string.IsNullOrWhiteSpace(request.ClientSecret) ||
            string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { error = "invalid_request" });
        }

        var client = await _oauthService.ValidateClientAsync(request.ClientId, request.ClientSecret, cancellationToken);
        if (client is null)
        {
            return BadRequest(new { error = "invalid_client" });
        }

        var refreshToken = await _dbContext.RefreshTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Token == request.RefreshToken, cancellationToken);

        if (refreshToken is null || refreshToken.ExpiresAt < DateTime.UtcNow || refreshToken.RevokedAt is not null)
        {
            return BadRequest(new { error = "invalid_grant" });
        }

        var user = refreshToken.User ?? await _dbContext.Users.FindAsync(new object?[] { refreshToken.UserId }, cancellationToken);
        if (user is null)
        {
            return BadRequest(new { error = "invalid_grant" });
        }

        refreshToken.RevokedAt = DateTime.UtcNow;
        var (accessToken, expiresAt) = _tokenService.CreateAccessToken(user);
        var newRefreshToken = _tokenService.CreateRefreshToken(user);
        user.RefreshTokens.Add(newRefreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Rotated refresh token for client {ClientId} and user {UserId}", client.ClientId, user.Id);

        return Ok(new OAuthTokenResponse
        {
            AccessToken = accessToken,
            ExpiresIn = (int)(expiresAt - DateTime.UtcNow).TotalSeconds,
            RefreshToken = newRefreshToken.Token
        });
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(subject) || !Guid.TryParse(subject, out var userId))
        {
            return null;
        }

        return await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }
}
