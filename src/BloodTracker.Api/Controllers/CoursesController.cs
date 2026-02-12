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
public class CoursesController(IMediator mediator) : ControllerBase
{
    [HttpGet("active")]
    public async Task<ActionResult<CourseDto>> GetActive(CancellationToken ct)
    {
        var result = await mediator.Send(new GetActiveCourseQuery(), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CourseDto>> Create([FromBody] CreateCourseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateCourseCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CourseDto>> Update(Guid id, [FromBody] CreateCourseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateCourseCommand(id, data), ct));

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> GetDashboard(CancellationToken ct)
        => Ok(await mediator.Send(new GetDashboardQuery(), ct));
}
