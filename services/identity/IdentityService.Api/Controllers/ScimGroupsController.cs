using IdentityService.Api.Data;
using IdentityService.Api.Dtos;
using IdentityService.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Controllers;

[ApiController]
[Route("scim/v2/Groups")]
[Produces("application/scim+json", "application/json")]
public class ScimGroupsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public ScimGroupsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> Query([FromQuery] int startIndex = 1, [FromQuery] int count = 50, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ScimGroups.Include(g => g.Members).ThenInclude(m => m.User);
        var totalResults = await query.CountAsync(cancellationToken);
        var groups = await query.Skip(Math.Max(startIndex - 1, 0)).Take(Math.Clamp(count, 1, 200)).ToListAsync(cancellationToken);
        var resources = groups.Select(MapToResource).ToList();

        var response = new
        {
            schemas = new[] { "urn:ietf:params:scim:api:messages:2.0:ListResponse" },
            totalResults,
            startIndex,
            itemsPerPage = resources.Count,
            Resources = resources
        };
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return NotFound();
        }

        var group = await _dbContext.ScimGroups
            .Include(g => g.Members)
            .ThenInclude(m => m.User)
            .SingleOrDefaultAsync(g => g.Id == groupId, cancellationToken);
        if (group is null)
        {
            return NotFound();
        }

        return Ok(MapToResource(group));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ScimGroupResource resource, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(resource.DisplayName))
        {
            return BadRequest(new { message = "DisplayName is required." });
        }

        var group = new ScimGroup
        {
            DisplayName = resource.DisplayName
        };
        await _dbContext.ScimGroups.AddAsync(group, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await UpdateMembershipAsync(group, resource.Members, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _dbContext.Entry(group).Collection(g => g.Members).Query().Include(m => m.User).LoadAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = group.Id }, MapToResource(group));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Replace(string id, [FromBody] ScimGroupResource resource, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return NotFound();
        }

        var group = await _dbContext.ScimGroups.Include(g => g.Members).ThenInclude(m => m.User).SingleOrDefaultAsync(g => g.Id == groupId, cancellationToken);
        if (group is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(resource.DisplayName))
        {
            group.DisplayName = resource.DisplayName;
        }

        await UpdateMembershipAsync(group, resource.Members, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await _dbContext.Entry(group).Collection(g => g.Members).Query().Include(m => m.User).LoadAsync(cancellationToken);
        return Ok(MapToResource(group));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var groupId))
        {
            return NotFound();
        }

        var group = await _dbContext.ScimGroups.Include(g => g.Members).SingleOrDefaultAsync(g => g.Id == groupId, cancellationToken);
        if (group is null)
        {
            return NotFound();
        }

        _dbContext.ScimGroupMembers.RemoveRange(group.Members);
        _dbContext.ScimGroups.Remove(group);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task UpdateMembershipAsync(ScimGroup group, IEnumerable<ScimGroupMemberResource>? members, CancellationToken cancellationToken)
    {
        _dbContext.ScimGroupMembers.RemoveRange(group.Members);
        group.Members.Clear();

        if (members is null)
        {
            return;
        }

        foreach (var member in members)
        {
            if (!Guid.TryParse(member.Value, out var userId))
            {
                continue;
            }

            var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (user is null)
            {
                continue;
            }

            var membership = new ScimGroupMember
            {
                GroupId = group.Id,
                UserId = user.Id
            };
            group.Members.Add(membership);
        }
    }

    private static ScimGroupResource MapToResource(ScimGroup group) => new()
    {
        Id = group.Id.ToString(),
        DisplayName = group.DisplayName,
        Members = group.Members.Select(m => new ScimGroupMemberResource
        {
            Value = m.UserId.ToString(),
            Display = m.User?.DisplayName ?? m.User?.Email ?? string.Empty
        }).ToList()
    };
}
