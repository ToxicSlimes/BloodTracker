using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class IntakeLogsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
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

    [HttpPost]
    public async Task<ActionResult<IntakeLogDto>> Create([FromBody] CreateIntakeLogDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateIntakeLogCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<IntakeLogDto>> Update(Guid id, [FromBody] UpdateIntakeLogDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateIntakeLogCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteIntakeLogCommand(id), ct) ? NoContent() : NotFound();
}
