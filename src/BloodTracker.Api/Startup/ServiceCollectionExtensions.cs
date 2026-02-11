using System.Text;
using BloodTracker.Application;
using BloodTracker.Application.Common;
using BloodTracker.Infrastructure;
using BloodTracker.Infrastructure.Persistence;
using BloodTracker.Infrastructure.Services;
using ElectronNET.API;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace BloodTracker.Api.Startup;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new() { Title = "BloodTracker API", Version = "v1" });
        });

        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", p =>
                p.SetIsOriginAllowed(_ => true)
                 .AllowAnyHeader()
                 .AllowAnyMethod());
        });

        // Electron.NET DI integration
        services.AddElectron();

        // JWT Authentication
        var jwtSecret = configuration["Jwt:Secret"] ?? "";
        if (!string.IsNullOrEmpty(jwtSecret))
        {
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = configuration["Jwt:Issuer"] ?? "BloodTracker",
                        ValidAudience = configuration["Jwt:Issuer"] ?? "BloodTracker",
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(jwtSecret)),
                        ClockSkew = TimeSpan.FromMinutes(1),
                        RoleClaimType = "role",
                        NameClaimType = "name"
                    };
                });
        }
        else
        {
            // Dev mode: no JWT secret configured, add a no-op auth scheme
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = false,
                        ValidateIssuerSigningKey = false,
                        RequireSignedTokens = false,
                        SignatureValidator = (token, _) => new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(token),
                        RoleClaimType = "role",
                        NameClaimType = "name"
                    };
                });
        }

        services.AddAuthorization(options =>
        {
            options.AddPolicy("Admin", policy => policy.RequireClaim("role", "admin"));
        });
        services.AddHttpContextAccessor();

        services.AddApplication();
        services.AddInfrastructure(configuration);

        return services;
    }
}
