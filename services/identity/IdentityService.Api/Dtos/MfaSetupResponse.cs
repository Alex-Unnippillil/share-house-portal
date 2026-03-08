namespace IdentityService.Api.Dtos;

public class MfaSetupResponse
{
    public string SharedKey { get; set; } = string.Empty;
    public string AuthenticatorUri { get; set; } = string.Empty;
}
