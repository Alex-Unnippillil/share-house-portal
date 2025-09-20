using System.Net.Http.Headers;
using System.Net.Http.Json;
using IdentityService.Api.Dtos;
using IdentityService.Tests.Infrastructure;
using FluentAssertions;
using OtpNet;

namespace IdentityService.Tests;

public class AuthenticationFlowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthenticationFlowTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_Then_Login_ReturnsTokens()
    {
        var email = $"user_{Guid.NewGuid():N}@example.com";
        var password = "Password!123";

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password,
            DisplayName = "Integration User"
        });

        registerResponse.EnsureSuccessStatusCode();
        var registerPayload = await registerResponse.Content.ReadFromJsonAsync<LoginResponse>();
        registerPayload.Should().NotBeNull();
        registerPayload!.AccessToken.Should().NotBeNullOrEmpty();
        registerPayload.RefreshToken.Should().NotBeNullOrEmpty();

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        loginResponse.EnsureSuccessStatusCode();
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();
        loginPayload!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task PasswordReset_AllowsLoggingInWithNewPassword()
    {
        var email = $"reset_{Guid.NewGuid():N}@example.com";
        var password = "InitialPass!234";
        var newPassword = "NewPass!345";

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password
        });
        registerResponse.EnsureSuccessStatusCode();

        var resetRequestResponse = await _client.PostAsJsonAsync("/api/auth/password-reset/request", new PasswordResetRequest
        {
            Email = email
        });
        resetRequestResponse.EnsureSuccessStatusCode();
        var resetPayload = await resetRequestResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        resetPayload.Should().ContainKey("token");
        var token = resetPayload!["token"];

        var confirmResponse = await _client.PostAsJsonAsync("/api/auth/password-reset/confirm", new PasswordResetConfirmRequest
        {
            Token = token,
            NewPassword = newPassword
        });
        confirmResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.NoContent);

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = newPassword
        });
        loginResponse.EnsureSuccessStatusCode();
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task MfaEnabled_RequiresCodeDuringLogin()
    {
        var email = $"mfa_{Guid.NewGuid():N}@example.com";
        var password = "MfaTest!678";

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password
        });
        registerResponse.EnsureSuccessStatusCode();
        var registerPayload = await registerResponse.Content.ReadFromJsonAsync<LoginResponse>();
        registerPayload.Should().NotBeNull();

        var accessToken = registerPayload!.AccessToken!;
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var setupResponse = await _client.PostAsync("/api/auth/mfa/setup", null);
        setupResponse.EnsureSuccessStatusCode();
        var setupPayload = await setupResponse.Content.ReadFromJsonAsync<MfaSetupResponse>();
        setupPayload.Should().NotBeNull();
        var secret = setupPayload!.SharedKey;

        var totp = new Totp(Base32Encoding.ToBytes(secret));
        var code = totp.ComputeTotp();

        var enableResponse = await _client.PostAsJsonAsync("/api/auth/mfa/enable", new MfaEnableRequest
        {
            Code = code
        });
        enableResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.NoContent);

        _client.DefaultRequestHeaders.Authorization = null;

        var loginWithoutMfaResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });
        loginWithoutMfaResponse.EnsureSuccessStatusCode();
        var loginWithoutMfaPayload = await loginWithoutMfaResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginWithoutMfaPayload!.MfaRequired.Should().BeTrue();

        var validMfaCode = totp.ComputeTotp();
        var loginWithMfaResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password,
            MfaCode = validMfaCode
        });
        loginWithMfaResponse.EnsureSuccessStatusCode();
        var loginWithMfaPayload = await loginWithMfaResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginWithMfaPayload!.AccessToken.Should().NotBeNullOrWhiteSpace();
        loginWithMfaPayload.MfaRequired.Should().BeFalse();
    }
}
