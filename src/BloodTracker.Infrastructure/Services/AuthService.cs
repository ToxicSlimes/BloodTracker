using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using Google.Apis.Auth;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
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
    public string ClientSecret { get; set; } = "";
    public string RefreshToken { get; set; } = "";
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
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;

    private const string GmailTokenCacheKey = "GmailAccessToken";

    /// <summary>
    /// Fallback JWT signing key used when Jwt:Secret is empty (local dev / E2E tests).
    /// NOT for production — production must set a real secret via environment or config.
    /// </summary>
    private const string DevFallbackSecret = "BloodTracker-Dev-Secret-NotForProduction-Min32Bytes!";

    public AuthService(
        IOptions<JwtSettings> jwt,
        IOptions<EmailSettings> email,
        IOptions<GoogleAuthSettings> google,
        ILogger<AuthService> logger,
        HttpClient httpClient,
        IMemoryCache cache)
    {
        _jwt = jwt.Value;
        _email = email.Value;
        _google = google.Value;
        _logger = logger;
        _httpClient = httpClient;
        _cache = cache;
    }

    public string GenerateJwtToken(AppUser user)
    {
        var secret = string.IsNullOrEmpty(_jwt.Secret) ? DevFallbackSecret : _jwt.Secret;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
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
        var secret = string.IsNullOrEmpty(_jwt.Secret) ? DevFallbackSecret : _jwt.Secret;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
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
        var subject = $"BloodTracker - Код входа: {code}";
        var html = $@"
<div style=""font-family: monospace; background: #0a0a0a; color: #00ff00; padding: 40px; text-align: center;"">
    <h1 style=""color: #00ff00; font-size: 24px;"">BLOODTRACKER</h1>
    <p style=""color: #888; font-size: 14px;"">Ваш код для входа:</p>
    <div style=""font-size: 48px; letter-spacing: 12px; padding: 20px; border: 2px solid #00ff00; display: inline-block; margin: 20px 0;"">{code}</div>
    <p style=""color: #666; font-size: 12px; margin-top: 20px;"">Код действителен 10 минут. Если вы не запрашивали вход, проигнорируйте это письмо.</p>
</div>";

        // Gmail API (HTTPS, port 443) — works when SMTP ports are blocked
        if (!string.IsNullOrEmpty(_google.RefreshToken) && !string.IsNullOrEmpty(_google.ClientSecret))
        {
            await SendViaGmailApiAsync(email, subject, html, ct);
        }
        else
        {
            await SendViaSmtpAsync(email, subject, html, ct);
        }

        _logger.LogInformation("Auth code sent to {Email}", email);
    }

    private async Task<string> GetGmailAccessTokenAsync(CancellationToken ct)
    {
        // Try to get cached token
        if (_cache.TryGetValue(GmailTokenCacheKey, out string? cachedToken) && cachedToken is not null)
            return cachedToken;

        // Refresh token from Google
        var tokenRequest = new Dictionary<string, string>
        {
            ["client_id"] = _google.ClientId,
            ["client_secret"] = _google.ClientSecret,
            ["refresh_token"] = _google.RefreshToken,
            ["grant_type"] = "refresh_token"
        };

        var response = await _httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(tokenRequest), ct);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Gmail token refresh failed: {err}");
        }

        var json = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>(ct);
        var accessToken = json.GetProperty("access_token").GetString()!;
        var expiresIn = json.GetProperty("expires_in").GetInt32();

        // Cache with 60s safety margin before actual expiration
        var cacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(expiresIn - 60)
        };
        _cache.Set(GmailTokenCacheKey, accessToken, cacheOptions);

        return accessToken;
    }

    private async Task SendViaGmailApiAsync(string to, string subject, string html, CancellationToken ct)
    {
        var accessToken = await GetGmailAccessTokenAsync(ct);

        // Build RFC 2822 message using MimeKit
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_email.FromName, _email.FromEmail));
        message.To.Add(new MailboxAddress(to, to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = html };

        using var stream = new MemoryStream();
        await message.WriteToAsync(stream, ct);
        var raw = Convert.ToBase64String(stream.ToArray())
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

        using var request = new HttpRequestMessage(HttpMethod.Post,
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(new { raw });

        var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"Gmail API error {response.StatusCode}: {body}");
        }

        _logger.LogInformation("Email sent via Gmail API to {Email}", to);
    }

    private async Task SendViaSmtpAsync(string to, string subject, string html, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_email.FromName, _email.FromEmail));
        message.To.Add(new MailboxAddress(to, to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = html };

        using var client = new SmtpClient();
        client.Timeout = 10_000;

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));
        try
        {
            await client.ConnectAsync(_email.SmtpHost, _email.SmtpPort,
                _email.SmtpPort == 465
                    ? MailKit.Security.SecureSocketOptions.SslOnConnect
                    : MailKit.Security.SecureSocketOptions.StartTls, timeoutCts.Token);
        }
        catch (System.Net.Sockets.SocketException) when (_email.SmtpPort != 465)
        {
            _logger.LogWarning("SMTP port {Port} blocked, retrying on 465 (SSL)", _email.SmtpPort);
            await client.ConnectAsync(_email.SmtpHost, 465,
                MailKit.Security.SecureSocketOptions.SslOnConnect, timeoutCts.Token);
        }
        await client.AuthenticateAsync(_email.SmtpUser, _email.SmtpPass, timeoutCts.Token);
        await client.SendAsync(message, timeoutCts.Token);
        await client.DisconnectAsync(true, ct);
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
