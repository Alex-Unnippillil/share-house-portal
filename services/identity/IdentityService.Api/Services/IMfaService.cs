namespace IdentityService.Api.Services;

public interface IMfaService
{
    string GenerateSecretKey();
    string GenerateQrCodeUri(string email, string secret, string issuer);
    bool ValidateCode(string secret, string code);
}
