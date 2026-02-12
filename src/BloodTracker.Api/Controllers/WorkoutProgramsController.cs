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
public class WorkoutProgramsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get all workout programs for the current user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<WorkoutProgramDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<WorkoutProgramDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllWorkoutProgramsQuery(), ct));

    /// <summary>
    /// Get a specific workout program by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutProgramDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkoutProgramDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutProgramByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new workout program.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(WorkoutProgramDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutProgramDto>> Create([FromBody] CreateWorkoutProgramDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutProgramCommand(data), ct));

    /// <summary>
    /// Update an existing workout program.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutProgramDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutProgramDto>> Update(Guid id, [FromBody] UpdateWorkoutProgramDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutProgramCommand(id, data), ct));

    /// <summary>
    /// Delete a workout program.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutProgramCommand(id), ct) ? NoContent() : NotFound();
}
