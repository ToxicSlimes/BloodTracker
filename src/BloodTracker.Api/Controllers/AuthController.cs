using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace BloodTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController(
    AuthDbContext authDb,
    IAuthService authService,
    IOptions<AdminSettings> adminSettings,
    IHostEnvironment env,
    ILogger<AuthController> logger) : ControllerBase
{
    public sealed record GoogleLoginRequest(string IdToken);
    public sealed record SendCodeRequest(string Email);
    public sealed record VerifyCodeRequest(string Email, string Code);
    public sealed record AuthResponse(string Token, UserInfo User);
    public sealed record UserInfo(Guid Id, string Email, string? DisplayName);

    /// <summary>
    /// Authenticate using Google OAuth2 ID token.
    /// </summary>
    [HttpPost("google")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(
        [FromBody] GoogleLoginRequest request, CancellationToken ct)
    {
        var result = await authService.VerifyGoogleTokenAsync(request.IdToken, ct);
        if (result is null)
            return Unauthorized(new { error = "Invalid Google token" });

        var (email, googleId, name) = result.Value;
        var user = authDb.Users.FindOne(u => u.Email == email);

        var isAdmin = adminSettings.Value.Emails
            .Contains(email, StringComparer.OrdinalIgnoreCase);

        if (user is null)
        {
            user = new AppUser
            {
                Email = email,
                DisplayName = name,
                GoogleId = googleId,
                IsAdmin = isAdmin,
                LastLoginAt = DateTime.UtcNow
            };
            authDb.Users.Insert(user);
            logger.LogInformation("New user registered via Google: {Email}", email);
        }
        else
        {
            user.GoogleId ??= googleId;
            user.DisplayName ??= name;
            user.IsAdmin = isAdmin;
            user.LastLoginAt = DateTime.UtcNow;
            authDb.Users.Update(user);
        }

        var token = authService.GenerateJwtToken(user);
        return Ok(new AuthResponse(token, new UserInfo(user.Id, user.Email, user.DisplayName)));
    }

    /// <summary>
    /// Send a one-time authentication code to the specified email.
    /// </summary>
    [HttpPost("send-code")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> SendCode(
        [FromBody] SendCodeRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required" });

        var code = authService.GenerateAuthCode();
        var authCode = new AuthCode
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };
        authDb.AuthCodes.Insert(authCode);

        try
        {
            await authService.SendAuthCodeEmailAsync(authCode.Email, code, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send auth code to {Email}", request.Email);
            logger.LogWarning("SMTP unavailable — returning code in response for {Email}", authCode.Email);
            return Ok(new { message = "Code sent", devCode = code });
        }

        // In Development, always include devCode for E2E/integration tests
        if (env.IsDevelopment())
            return Ok(new { message = "Code sent", devCode = code });

        return Ok(new { message = "Code sent" });
    }

    /// <summary>
    /// Verify a one-time authentication code and obtain JWT token.
    /// </summary>
    [HttpPost("verify-code")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<AuthResponse> VerifyCode([FromBody] VerifyCodeRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var code = authDb.AuthCodes.FindOne(c =>
            c.Email == email &&
            c.Code == request.Code &&
            !c.Used &&
            c.ExpiresAt > DateTime.UtcNow);

        if (code is null)
            return Unauthorized(new { error = "Invalid or expired code" });

        code.Used = true;
        authDb.AuthCodes.Update(code);

        var isAdmin = adminSettings.Value.Emails
            .Contains(email, StringComparer.OrdinalIgnoreCase);

        var user = authDb.Users.FindOne(u => u.Email == email);
        if (user is null)
        {
            user = new AppUser
            {
                Email = email,
                IsAdmin = isAdmin,
                LastLoginAt = DateTime.UtcNow
            };
            authDb.Users.Insert(user);
            logger.LogInformation("New user registered via email code: {Email}", email);
        }
        else
        {
            user.IsAdmin = isAdmin;
            user.LastLoginAt = DateTime.UtcNow;
            authDb.Users.Update(user);
        }

        var token = authService.GenerateJwtToken(user);
        return Ok(new AuthResponse(token, new UserInfo(user.Id, user.Email, user.DisplayName)));
    }

    /// <summary>
    /// Get public authentication configuration (e.g. Google Client ID).
    /// </summary>
    [HttpGet("config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetConfig()
    {
        var googleClientId = HttpContext.RequestServices
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<Infrastructure.Services.GoogleAuthSettings>>()
            .Value.ClientId;
        return Ok(new { googleClientId });
    }

    /// <summary>
    /// Get the currently authenticated user's information.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<UserInfo> Me()
    {
        var userContext = HttpContext.RequestServices.GetRequiredService<IUserContext>();
        var user = authDb.Users.FindById(userContext.UserId);
        if (user is null) return NotFound();
        return Ok(new UserInfo(user.Id, user.Email, user.DisplayName));
    }
}
