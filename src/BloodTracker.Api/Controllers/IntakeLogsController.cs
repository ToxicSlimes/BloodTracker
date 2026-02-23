using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class IntakeLogsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get intake logs with optional filtering by drug, date range, and limit.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<IntakeLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<IntakeLogDto>>> Get(
        [FromQuery] Guid? drugId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? limit,
        CancellationToken ct = default)
    {
        if (drugId.HasValue || startDate.HasValue || endDate.HasValue || limit.HasValue)
            return Ok(await mediator.Send(new GetIntakeLogsByDrugQuery(drugId, startDate, endDate, limit), ct));

        return Ok(await mediator.Send(new GetRecentIntakeLogsQuery(limit ?? 10), ct));
    }

    /// <summary>
    /// Get a single intake log by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(IntakeLogDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IntakeLogDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetIntakeLogByIdQuery(id), ct);
        return result is not null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Create a new intake log entry.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(IntakeLogDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IntakeLogDto>> Create([FromBody] CreateIntakeLogDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateIntakeLogCommand(data), ct));

    /// <summary>
    /// Update an existing intake log entry.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(IntakeLogDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IntakeLogDto>> Update(Guid id, [FromBody] UpdateIntakeLogDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateIntakeLogCommand(id, data), ct));

    /// <summary>
    /// Delete an intake log entry.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteIntakeLogCommand(id), ct) ? NoContent() : NotFound();
}
