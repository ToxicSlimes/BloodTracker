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
public class WorkoutDaysController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get all workout days for a specific program.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<WorkoutDayDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<WorkoutDayDto>>> GetByProgram([FromQuery] Guid programId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutDaysByProgramQuery(programId), ct));

    /// <summary>
    /// Get a specific workout day by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutDayDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkoutDayDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutDayByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new workout day.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(WorkoutDayDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutDayDto>> Create([FromBody] CreateWorkoutDayDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutDayCommand(data), ct));

    /// <summary>
    /// Update an existing workout day.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutDayDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkoutDayDto>> Update(Guid id, [FromBody] UpdateWorkoutDayDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutDayCommand(id, data), ct));

    /// <summary>
    /// Delete a workout day.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutDayCommand(id), ct) ? NoContent() : NotFound();
}
