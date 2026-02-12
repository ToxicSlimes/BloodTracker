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
public class WorkoutProgramsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutProgramDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllWorkoutProgramsQuery(), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutProgramDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutProgramByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutProgramDto>> Create([FromBody] CreateWorkoutProgramDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutProgramCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutProgramDto>> Update(Guid id, [FromBody] UpdateWorkoutProgramDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutProgramCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutProgramCommand(id), ct) ? NoContent() : NotFound();
}
