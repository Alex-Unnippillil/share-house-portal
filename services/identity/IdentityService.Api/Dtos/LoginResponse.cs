namespace IdentityService.Api.Dtos;

public class LoginResponse
{
    public bool MfaRequired { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
