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
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CoursesController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get the currently active supplement/drug course.
    /// </summary>
    [HttpGet("active")]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseDto>> GetActive(CancellationToken ct)
    {
        var result = await mediator.Send(new GetActiveCourseQuery(), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new supplement/drug course.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CourseDto>> Create([FromBody] CreateCourseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateCourseCommand(data), ct));

    /// <summary>
    /// Update an existing supplement/drug course.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CourseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CourseDto>> Update(Guid id, [FromBody] CreateCourseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateCourseCommand(id, data), ct));

    /// <summary>
    /// Get the dashboard with active course and intake logs.
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardDto>> GetDashboard(CancellationToken ct)
        => Ok(await mediator.Send(new GetDashboardQuery(), ct));
}
