namespace IdentityService.Api.Dtos;

public class OAuthAuthorizationResponse
{
    public string Code { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    public string? State { get; set; }
    public DateTime ExpiresAt { get; set; }
}
