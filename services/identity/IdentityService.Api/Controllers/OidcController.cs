using System.Text;
using IdentityService.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace IdentityService.Api.Controllers;

[ApiController]
[Route(".well-known")]
public class OidcController : ControllerBase
{
    private readonly JwtOptions _jwtOptions;

    public OidcController(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    [HttpGet("openid-configuration")]
    [Produces("application/json")]
    public IActionResult GetConfiguration()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var issuer = string.IsNullOrWhiteSpace(_jwtOptions.Issuer) ? baseUrl : _jwtOptions.Issuer;
        var configuration = new
        {
            issuer,
            authorization_endpoint = baseUrl + "/oauth/authorize",
            token_endpoint = baseUrl + "/oauth/token",
            userinfo_endpoint = baseUrl + "/oauth/userinfo",
            jwks_uri = baseUrl + "/.well-known/jwks.json",
            response_types_supported = new[] { "code" },
            subject_types_supported = new[] { "public" },
            id_token_signing_alg_values_supported = new[] { SecurityAlgorithms.HmacSha256 },
            scopes_supported = new[] { "openid", "profile" },
            claims_supported = new[] { "sub", "name", "email" }
        };
        return Ok(configuration);
    }

    [HttpGet("jwks.json")]
    [Produces("application/json")]
    public IActionResult GetJwks()
    {
        var keyBytes = Encoding.UTF8.GetBytes(_jwtOptions.SigningKey);
        var jwks = new
        {
            keys = new[]
            {
                new
                {
                    kty = "oct",
                    alg = SecurityAlgorithms.HmacSha256,
                    k = Base64UrlEncoder.Encode(keyBytes),
                    kid = "default"
                }
            }
        };
        return Ok(jwks);
    }
}
