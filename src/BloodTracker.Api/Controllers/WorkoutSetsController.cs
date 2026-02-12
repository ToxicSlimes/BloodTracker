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
public class WorkoutSetsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutSetDto>>> GetByExercise([FromQuery] Guid exerciseId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutSetsByExerciseQuery(exerciseId), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutSetDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutSetByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutSetDto>> Create([FromBody] CreateWorkoutSetDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutSetCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutSetDto>> Update(Guid id, [FromBody] UpdateWorkoutSetDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutSetCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutSetCommand(id), ct) ? NoContent() : NotFound();
}
