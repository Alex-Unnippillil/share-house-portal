namespace IdentityService.Api.Models;

public class JwtOptions
{
    public string Issuer { get; set; } = "ShareHouse.Identity";
    public string Audience { get; set; } = "ShareHouse.Identity.Client";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}
