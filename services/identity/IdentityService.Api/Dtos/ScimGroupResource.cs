namespace IdentityService.Api.Dtos;

public class ScimGroupResource
{
    public string[] Schemas { get; set; } = new[] { "urn:ietf:params:scim:schemas:core:2.0:Group" };

    public string? Id { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public List<ScimGroupMemberResource> Members { get; set; } = new();
}

public class ScimGroupMemberResource
{
    public string Value { get; set; } = string.Empty;
    public string Display { get; set; } = string.Empty;
}
