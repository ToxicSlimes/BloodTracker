using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using Google.Apis.Auth;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MimeKit;

namespace BloodTracker.Infrastructure.Services;

public sealed class JwtSettings
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "BloodTracker";
    public int ExpiresInDays { get; set; } = 30;
}

public sealed class EmailSettings
{
    public string SmtpHost { get; set; } = "";
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = "";
    public string SmtpPass { get; set; } = "";
    public string FromEmail { get; set; } = "noreply@bloodtracker.app";
    public string FromName { get; set; } = "BloodTracker";
}

public sealed class GoogleAuthSettings
{
    public string ClientId { get; set; } = "";
}

public sealed class AdminSettings
{
    public List<string> Emails { get; set; } = new();
}

public sealed class AuthService : IAuthService
{
    private readonly JwtSettings _jwt;
    private readonly EmailSettings _email;
    private readonly GoogleAuthSettings _google;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IOptions<JwtSettings> jwt,
        IOptions<EmailSettings> email,
        IOptions<GoogleAuthSettings> google,
        ILogger<AuthService> logger)
    {
        _jwt = jwt.Value;
        _email = email.Value;
        _google = google.Value;
        _logger = logger;
    }

    public string GenerateJwtToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.DisplayName ?? user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (user.IsAdmin)
            claims.Add(new Claim("role", "admin"));

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(_jwt.ExpiresInDays),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateImpersonationToken(AppUser targetUser)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, targetUser.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, targetUser.Email),
            new("name", targetUser.DisplayName ?? targetUser.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("impersonated", "true")
        };

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<(string Email, string GoogleId, string? Name)?> VerifyGoogleTokenAsync(
        string idToken, CancellationToken ct = default)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _google.ClientId }
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return (payload.Email, payload.Subject, payload.Name);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google token verification failed");
            return null;
        }
    }

    public string GenerateAuthCode()
    {
        return RandomNumberGenerator.GetInt32(100000, 999999).ToString();
    }

    public async Task SendAuthCodeEmailAsync(string email, string code, CancellationToken ct = default)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_email.FromName, _email.FromEmail));
        message.To.Add(new MailboxAddress(email, email));
        message.Subject = $"BloodTracker - Код входа: {code}";

        message.Body = new TextPart("html")
        {
            Text = $@"
<div style=""font-family: monospace; background: #0a0a0a; color: #00ff00; padding: 40px; text-align: center;"">
    <h1 style=""color: #00ff00; font-size: 24px;"">BLOODTRACKER</h1>
    <p style=""color: #888; font-size: 14px;"">Ваш код для входа:</p>
    <div style=""font-size: 48px; letter-spacing: 12px; padding: 20px; border: 2px solid #00ff00; display: inline-block; margin: 20px 0;"">{code}</div>
    <p style=""color: #666; font-size: 12px; margin-top: 20px;"">Код действителен 10 минут. Если вы не запрашивали вход, проигнорируйте это письмо.</p>
</div>"
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(_email.SmtpHost, _email.SmtpPort, MailKit.Security.SecureSocketOptions.StartTls, ct);
        await client.AuthenticateAsync(_email.SmtpUser, _email.SmtpPass, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);

        _logger.LogInformation("Auth code sent to {Email}", email);
    }
}

public sealed class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid UserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return sub is not null ? Guid.Parse(sub) : Guid.Empty;
        }
    }

    public string Email =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Email)
        ?? _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email)
        ?? "";

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public bool IsAdmin =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue("role") == "admin";
}
