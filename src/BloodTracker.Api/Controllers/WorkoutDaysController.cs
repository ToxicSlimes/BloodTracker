using BloodTracker.Application.Workouts.Commands;
using BloodTracker.Application.Workouts.Dto;
using BloodTracker.Application.Workouts.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkoutDaysController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutDayDto>>> GetByProgram([FromQuery] Guid programId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutDaysByProgramQuery(programId), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutDayDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutDayByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutDayDto>> Create([FromBody] CreateWorkoutDayDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutDayCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutDayDto>> Update(Guid id, [FromBody] UpdateWorkoutDayDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutDayCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutDayCommand(id), ct) ? NoContent() : NotFound();
}
