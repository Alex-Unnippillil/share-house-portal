namespace IdentityService.Api.Dtos;

public class ScimUserResource
{
    public string[] Schemas { get; set; } = new[] { "urn:ietf:params:scim:schemas:core:2.0:User" };

    public string? Id { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public bool Active { get; set; } = true;

    public string? Password { get; set; }
}
