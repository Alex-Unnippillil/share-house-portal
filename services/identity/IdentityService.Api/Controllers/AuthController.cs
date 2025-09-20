using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using IdentityService.Api.Data;
using IdentityService.Api.Dtos;
using IdentityService.Api.Entities;
using IdentityService.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ITokenService _tokenService;
    private readonly IMfaService _mfaService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext dbContext, ITokenService tokenService, IMfaService mfaService, IPasswordHasher<User> passwordHasher, ILogger<AuthController> logger)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _mfaService = mfaService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (await _dbContext.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new User
        {
            Email = request.Email,
            DisplayName = request.DisplayName
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        var refreshToken = _tokenService.CreateRefreshToken(user);
        user.RefreshTokens.Add(refreshToken);

        await _dbContext.Users.AddAsync(user, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var (accessToken, expiresAt) = _tokenService.CreateAccessToken(user);
        return Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt = expiresAt,
            MfaRequired = false
        });
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            _logger.LogWarning("Login failed for {Email}: user not found", request.Email);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var passwordResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (passwordResult == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Login failed for {Email}: invalid password", request.Email);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        if (user.MfaEnabled)
        {
            if (string.IsNullOrWhiteSpace(request.MfaCode) || !_mfaService.ValidateCode(user.MfaSecret!, request.MfaCode))
            {
                _logger.LogInformation("MFA required for user {UserId}", user.Id);
                return Ok(new LoginResponse { MfaRequired = true });
            }
        }

        PruneExpiredRefreshTokens(user);

        var refreshToken = _tokenService.CreateRefreshToken(user);
        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var (accessToken, expiresAt) = _tokenService.CreateAccessToken(user);
        return Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt = expiresAt,
            MfaRequired = false
        });
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken cancellationToken)
    {
        var refreshToken = await _dbContext.RefreshTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Token == request.RefreshToken, cancellationToken);

        if (refreshToken is null || refreshToken.RevokedAt is not null || refreshToken.ExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Refresh token is invalid or expired." });
        }

        var user = refreshToken.User ?? await _dbContext.Users.FindAsync(new object?[] { refreshToken.UserId }, cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        refreshToken.RevokedAt = DateTime.UtcNow;
        PruneExpiredRefreshTokens(user);

        var newRefreshToken = _tokenService.CreateRefreshToken(user);
        _dbContext.RefreshTokens.Add(newRefreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var (accessToken, expiresAt) = _tokenService.CreateAccessToken(user);
        return Ok(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = newRefreshToken.Token,
            ExpiresAt = expiresAt,
            MfaRequired = user.MfaEnabled
        });
    }

    [HttpPost("password-reset/request")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RequestPasswordReset([FromBody] PasswordResetRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
        if (user is null)
        {
            return Ok(new { message = "If the email exists, a reset token has been generated." });
        }

        var token = new PasswordResetToken
        {
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            UserId = user.Id
        };
        await _dbContext.PasswordResetTokens.AddAsync(token, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // In a real system the token would be emailed. For development/testing we return it in the payload.
        return Ok(new
        {
            message = "Password reset token generated.",
            token = token.Token,
            expiresAt = token.ExpiresAt
        });
    }

    [HttpPost("password-reset/confirm")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmPasswordReset([FromBody] PasswordResetConfirmRequest request, CancellationToken cancellationToken)
    {
        var token = await _dbContext.PasswordResetTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.Token == request.Token, cancellationToken);

        if (token is null || token.Used || token.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Token is invalid or expired." });
        }

        var user = token.User ?? await _dbContext.Users.FindAsync(new object?[] { token.UserId }, cancellationToken);
        if (user is null)
        {
            return BadRequest(new { message = "Associated user not found." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        token.Used = true;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [Authorize]
    [HttpPost("mfa/setup")]
    [ProducesResponseType(typeof(MfaSetupResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetupMfa(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        var secret = _mfaService.GenerateSecretKey();
        user.MfaSecret = secret;
        user.MfaEnabled = false;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var uri = _mfaService.GenerateQrCodeUri(user.Email, secret, "ShareHouse Identity");
        return Ok(new MfaSetupResponse
        {
            SharedKey = secret,
            AuthenticatorUri = uri
        });
    }

    [Authorize]
    [HttpPost("mfa/enable")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EnableMfa([FromBody] MfaEnableRequest request, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        var secret = request.SharedKey ?? user.MfaSecret;
        if (string.IsNullOrWhiteSpace(secret) || !_mfaService.ValidateCode(secret!, request.Code))
        {
            return BadRequest(new { message = "Invalid MFA verification code." });
        }

        user.MfaSecret = secret;
        user.MfaEnabled = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPost("mfa/disable")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DisableMfa(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        user.MfaEnabled = false;
        user.MfaSecret = null;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(subject))
        {
            return null;
        }

        if (!Guid.TryParse(subject, out var userId))
        {
            return null;
        }

        return await _dbContext.Users.Include(u => u.RefreshTokens).SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    private static void PruneExpiredRefreshTokens(User user)
    {
        var expired = user.RefreshTokens.Where(t => t.ExpiresAt < DateTime.UtcNow).ToList();
        foreach (var token in expired)
        {
            user.RefreshTokens.Remove(token);
        }
    }
}
