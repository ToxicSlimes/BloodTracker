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
public class WorkoutExercisesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutExerciseDto>>> GetAll(
        [FromQuery] Guid? programId,
        [FromQuery] Guid? dayId,
        CancellationToken ct)
    {
        if (dayId.HasValue)
            return Ok(await mediator.Send(new GetWorkoutExercisesByDayQuery(dayId.Value), ct));

        if (programId.HasValue)
            return Ok(await mediator.Send(new GetWorkoutExercisesByProgramQuery(programId.Value), ct));

        return BadRequest("programId or dayId is required");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutExerciseDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutExerciseByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutExerciseDto>> Create([FromBody] CreateWorkoutExerciseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutExerciseCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutExerciseDto>> Update(Guid id, [FromBody] UpdateWorkoutExerciseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutExerciseCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutExerciseCommand(id), ct) ? NoContent() : NotFound();
}
