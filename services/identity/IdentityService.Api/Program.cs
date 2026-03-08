using System.Text;
using IdentityService.Api.Data;
using IdentityService.Api.Entities;
using IdentityService.Api.Extensions;
using IdentityService.Api.Models;
using IdentityService.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Configuration
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey))
{
    jwtOptions.SigningKey = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
    builder.Configuration["Jwt:SigningKey"] = jwtOptions.SigningKey;
}

builder.Services.Configure<JwtOptions>(opts =>
{
    opts.Issuer = jwtOptions.Issuer;
    opts.Audience = jwtOptions.Audience;
    opts.SigningKey = jwtOptions.SigningKey;
    opts.AccessTokenMinutes = jwtOptions.AccessTokenMinutes;
    opts.RefreshTokenDays = jwtOptions.RefreshTokenDays;
});

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=identity.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IMfaService, MfaService>();
builder.Services.AddScoped<IOAuthService, OAuthService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ShareHouse Identity API",
        Version = "v1",
        Description = "Authentication, OAuth, and SCIM provisioning endpoints for the ShareHouse platform."
    });

    var bearerScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Provide the access token as: Bearer {token}"
    };
    c.AddSecurityDefinition("Bearer", bearerScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            bearerScheme,
            new List<string>()
        }
    });

    var oauthScheme = new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri("/oauth/authorize", UriKind.Relative),
                TokenUrl = new Uri("/oauth/token", UriKind.Relative),
                Scopes = new Dictionary<string, string>
                {
                    { "openid", "OpenID Connect identity scope" },
                    { "profile", "Access to basic profile information" }
                }
            }
        }
    };
    c.AddSecurityDefinition("OAuth2", oauthScheme);
});

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey));
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidAudience = jwtOptions.Audience,
        IssuerSigningKey = signingKey,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

await app.ApplyMigrationsAsync();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "ShareHouse Identity API");
        options.OAuthClientId("sharehouse-web");
        options.OAuthUsePkce();
    });
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
