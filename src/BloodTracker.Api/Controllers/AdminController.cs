using BloodTracker.Application.Admin.Commands;
using BloodTracker.Application.Admin.Dto;
using BloodTracker.Application.Admin.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize(Policy = "Admin")]
[ApiController]
[Route("api/[controller]")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public class AdminController(
    IMediator mediator,
    AuthDbContext authDb,
    IAuthService authService,
    ILogger<AdminController> logger) : ControllerBase
{
    public sealed record UpdateRoleRequest(bool IsAdmin);
    public sealed record ImpersonateResponse(string Token, string Email, string? DisplayName);

    /// <summary>
    /// Get all users (admin only).
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(List<AdminUserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers(CancellationToken ct)
    {
        var result = await mediator.Send(new GetAllAdminUsersQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Get detailed summary for a specific user (admin only).
    /// </summary>
    [HttpGet("users/{id:guid}/summary")]
    [ProducesResponseType(typeof(AdminUserSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserSummaryDto>> GetUserSummary(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetAdminUserSummaryQuery(id), ct);
        if (result is null)
            return NotFound();
        
        return Ok(result);
    }

    /// <summary>
    /// Get platform-wide statistics (admin only).
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminStatsDto>> GetStats(CancellationToken ct)
    {
        var result = await mediator.Send(new GetAdminStatsQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Update user's admin role (admin only).
    /// </summary>
    [HttpPut("users/{id:guid}/role")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken ct)
    {
        var user = authDb.Users.FindById(id);
        if (user is null)
            return NotFound();

        await mediator.Send(new UpdateUserRoleCommand(id, request.IsAdmin), ct);
        
        return Ok(new { user.Email, IsAdmin = request.IsAdmin });
    }

    /// <summary>
    /// Delete a user and all their data (admin only).
    /// </summary>
    [HttpDelete("users/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var user = authDb.Users.FindById(id);
        if (user is null)
            return NotFound();

        await mediator.Send(new DeleteUserCommand(id), ct);
        
        return NoContent();
    }

    /// <summary>
    /// Generate an impersonation token to access the system as another user (admin only).
    /// </summary>
    [HttpGet("impersonate/{id:guid}")]
    [ProducesResponseType(typeof(ImpersonateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<ImpersonateResponse> Impersonate(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        var token = authService.GenerateImpersonationToken(user);
        logger.LogInformation("Admin impersonating user {Email} ({UserId})", user.Email, id);

        return Ok(new ImpersonateResponse(token, user.Email, user.DisplayName));
    }
}
