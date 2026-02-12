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
public class AdminController(
    IMediator mediator,
    AuthDbContext authDb,
    IAuthService authService,
    ILogger<AdminController> logger) : ControllerBase
{
    public sealed record UpdateRoleRequest(bool IsAdmin);
    public sealed record ImpersonateResponse(string Token, string Email, string? DisplayName);

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers(CancellationToken ct)
    {
        var result = await mediator.Send(new GetAllAdminUsersQuery(), ct);
        return Ok(result);
    }

    [HttpGet("users/{id:guid}/summary")]
    public async Task<ActionResult<AdminUserSummaryDto>> GetUserSummary(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetAdminUserSummaryQuery(id), ct);
        if (result is null)
            return NotFound();
        
        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> GetStats(CancellationToken ct)
    {
        var result = await mediator.Send(new GetAdminStatsQuery(), ct);
        return Ok(result);
    }

    [HttpPut("users/{id:guid}/role")]
    public async Task<ActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken ct)
    {
        var user = authDb.Users.FindById(id);
        if (user is null)
            return NotFound();

        await mediator.Send(new UpdateUserRoleCommand(id, request.IsAdmin), ct);
        
        return Ok(new { user.Email, IsAdmin = request.IsAdmin });
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<ActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var user = authDb.Users.FindById(id);
        if (user is null)
            return NotFound();

        await mediator.Send(new DeleteUserCommand(id), ct);
        
        return NoContent();
    }

    [HttpGet("impersonate/{id:guid}")]
    public ActionResult<ImpersonateResponse> Impersonate(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        var token = authService.GenerateImpersonationToken(user);
        logger.LogInformation("Admin impersonating user {Email} ({UserId})", user.Email, id);

        return Ok(new ImpersonateResponse(token, user.Email, user.DisplayName));
    }
}
