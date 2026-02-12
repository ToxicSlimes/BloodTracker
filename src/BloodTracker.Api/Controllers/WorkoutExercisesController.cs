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
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class WorkoutExercisesController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get workout exercises filtered by program or day.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<WorkoutExerciseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
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

    /// <summary>
    /// Get a specific workout exercise by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutExerciseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkoutExerciseDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutExerciseByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new workout exercise.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(WorkoutExerciseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutExerciseDto>> Create([FromBody] CreateWorkoutExerciseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutExerciseCommand(data), ct));

    /// <summary>
    /// Update an existing workout exercise.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutExerciseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutExerciseDto>> Update(Guid id, [FromBody] UpdateWorkoutExerciseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutExerciseCommand(id, data), ct));

    /// <summary>
    /// Delete a workout exercise.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutExerciseCommand(id), ct) ? NoContent() : NotFound();
}
