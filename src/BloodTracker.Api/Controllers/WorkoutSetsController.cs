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
public class WorkoutSetsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get all sets for a specific workout exercise.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<WorkoutSetDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<WorkoutSetDto>>> GetByExercise([FromQuery] Guid exerciseId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutSetsByExerciseQuery(exerciseId), ct));

    /// <summary>
    /// Get a specific workout set by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutSetDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkoutSetDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutSetByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new workout set.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(WorkoutSetDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutSetDto>> Create([FromBody] CreateWorkoutSetDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutSetCommand(data), ct));

    /// <summary>
    /// Update an existing workout set.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutSetDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutSetDto>> Update(Guid id, [FromBody] UpdateWorkoutSetDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutSetCommand(id, data), ct));

    /// <summary>
    /// Delete a workout set.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutSetCommand(id), ct) ? NoContent() : NotFound();
}
