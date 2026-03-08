using IdentityService.Api.Data;
using IdentityService.Api.Dtos;
using IdentityService.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Api.Controllers;

[ApiController]
[Route("scim/v2/Users")]
[Produces("application/scim+json", "application/json")]
public class ScimUsersController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    public ScimUsersController(AppDbContext dbContext, IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<IActionResult> Query([FromQuery] string? filter, [FromQuery] int startIndex = 1, [FromQuery] int count = 50, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(filter))
        {
            query = ApplyFilter(query, filter);
        }

        var totalResults = await query.CountAsync(cancellationToken);
        var users = await query.Skip(Math.Max(startIndex - 1, 0)).Take(Math.Clamp(count, 1, 200)).ToListAsync(cancellationToken);
        var resources = users.Select(MapToResource).ToList();

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
        if (!Guid.TryParse(id, out var userId))
        {
            return NotFound();
        }

        var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(MapToResource(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ScimUserResource resource, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(resource.Email) && string.IsNullOrWhiteSpace(resource.UserName))
        {
            return BadRequest(new { message = "UserName or Email must be provided." });
        }

        var email = resource.Email ?? resource.UserName;
        if (await _dbContext.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            return Conflict(new { message = "A user with that email already exists." });
        }

        var user = new User
        {
            Email = email!,
            DisplayName = resource.DisplayName,
            Active = resource.Active
        };
        var password = string.IsNullOrWhiteSpace(resource.Password) ? Guid.NewGuid().ToString("N").Substring(0, 12) : resource.Password!;
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        await _dbContext.Users.AddAsync(user, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var createdResource = MapToResource(user);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, createdResource);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Replace(string id, [FromBody] ScimUserResource resource, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var userId))
        {
            return NotFound();
        }

        var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(resource.Email) && !string.Equals(resource.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            if (await _dbContext.Users.AnyAsync(u => u.Email == resource.Email && u.Id != userId, cancellationToken))
            {
                return Conflict(new { message = "A user with that email already exists." });
            }
            user.Email = resource.Email!;
        }

        user.DisplayName = resource.DisplayName;
        user.Active = resource.Active;

        if (!string.IsNullOrWhiteSpace(resource.Password))
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, resource.Password);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(MapToResource(user));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var userId))
        {
            return NotFound();
        }

        var user = await _dbContext.Users.Include(u => u.RefreshTokens).SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        _dbContext.RefreshTokens.RemoveRange(user.RefreshTokens);
        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static IQueryable<User> ApplyFilter(IQueryable<User> query, string filter)
    {
        var segments = filter.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (segments.Length < 3)
        {
            return query;
        }

        var attribute = segments[0];
        var operation = segments[1];
        var value = segments[2].Trim('\"');

        if (!string.Equals(operation, "eq", StringComparison.OrdinalIgnoreCase))
        {
            return query;
        }

        return attribute switch
        {
            "userName" => query.Where(u => u.Email == value),
            "email" => query.Where(u => u.Email == value),
            "active" => bool.TryParse(value, out var active) ? query.Where(u => u.Active == active) : query,
            _ => query
        };
    }

    private static ScimUserResource MapToResource(User user) => new()
    {
        Id = user.Id.ToString(),
        UserName = user.Email,
        Email = user.Email,
        DisplayName = user.DisplayName ?? string.Empty,
        Active = user.Active
    };
}
