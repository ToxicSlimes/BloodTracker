using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Application.WorkoutDiary.Queries;
using BloodTracker.Domain.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/analytics")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class AnalyticsController(IMediator mediator, IUserContext userContext) : ControllerBase
{
    private string UserId => userContext.UserId.ToString();

    [HttpGet("exercise-progress")]
    [ProducesResponseType(typeof(ExerciseProgressDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExerciseProgressDto>> GetExerciseProgress(
        [FromQuery] string exerciseName, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(await mediator.Send(new GetExerciseProgressQuery(UserId, exerciseName, from, to), ct));

    [HttpGet("muscle-group-progress")]
    [ProducesResponseType(typeof(MuscleGroupProgressDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MuscleGroupProgressDto>> GetMuscleGroupProgress(
        [FromQuery] MuscleGroup muscleGroup, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(await mediator.Send(new GetMuscleGroupProgressQuery(UserId, muscleGroup, from, to), ct));

    [HttpGet("personal-records")]
    [ProducesResponseType(typeof(PagedResult<PersonalRecordLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PersonalRecordLogDto>>> GetPersonalRecords(
        [FromQuery] string? exerciseName, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetPersonalRecordsQuery(UserId, exerciseName, page, pageSize), ct));

    [HttpGet("stats")]
    [ProducesResponseType(typeof(WorkoutStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutStatsDto>> GetStats(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetWorkoutStatsQuery(UserId, from, to), ct));

    [HttpGet("strength-level")]
    [ProducesResponseType(typeof(StrengthLevelDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StrengthLevelDto>> GetStrengthLevel(
        [FromQuery] string exerciseId, [FromQuery] decimal bodyweight, [FromQuery] string gender, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetStrengthLevelQuery(UserId, exerciseId, bodyweight, gender), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("calendar")]
    [ProducesResponseType(typeof(List<DateTime>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<DateTime>>> GetCalendar(
        [FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetWorkoutCalendarQuery(UserId, from, to), ct));

    [HttpGet("exercise-prs")]
    [ProducesResponseType(typeof(List<UserExercisePRDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<UserExercisePRDto>>> GetAllExercisePRs(CancellationToken ct = default)
        => Ok(await mediator.Send(new GetAllExercisePRsQuery(UserId), ct));

    [HttpGet("all-muscle-groups")]
    [ProducesResponseType(typeof(AllMuscleGroupsStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AllMuscleGroupsStatsDto>> GetAllMuscleGroupStats(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetAllMuscleGroupStatsQuery(UserId, from, to), ct));
}
