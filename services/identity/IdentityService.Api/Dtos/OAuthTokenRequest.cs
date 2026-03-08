using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace IdentityService.Api.Dtos;

public class OAuthTokenRequest
{
    [Required]
    [JsonPropertyName("grant_type")]
    public string GrantType { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("redirect_uri")]
    public string? RedirectUri { get; set; }

    [JsonPropertyName("client_id")]
    public string? ClientId { get; set; }

    [JsonPropertyName("client_secret")]
    public string? ClientSecret { get; set; }

    [JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; set; }
}
