using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Application.WorkoutDiary.Queries;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workout-sessions")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class WorkoutSessionsController(IMediator mediator, IUserContext userContext) : ControllerBase
{
    private string UserId => userContext.UserId.ToString();

    [HttpPost("start")]
    [ProducesResponseType(typeof(WorkoutSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionDto>> Start([FromBody] StartWorkoutSessionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new StartWorkoutSessionCommand(
            UserId, request.SourceDayId, request.CustomTitle, request.Notes, request.RepeatLast), ct));

    [HttpPost("{id:guid}/sets/{setId:guid}/complete")]
    [ProducesResponseType(typeof(CompleteSetResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CompleteSetResultDto>> CompleteSet(Guid id, Guid setId, [FromBody] CompleteSetRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new CompleteSetCommand(
            UserId, id, setId, request.Weight, request.WeightKg, request.Repetitions,
            request.DurationSeconds, request.RPE, request.Type, request.Notes), ct));

    [HttpPost("{id:guid}/sets/undo")]
    [ProducesResponseType(typeof(WorkoutSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionDto>> UndoLastSet(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new UndoLastSetCommand(UserId, id), ct));

    [HttpPost("{id:guid}/exercises")]
    [ProducesResponseType(typeof(WorkoutSessionExerciseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionExerciseDto>> AddExercise(Guid id, [FromBody] AddExerciseRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddExerciseCommand(
            UserId, id, request.Name, request.MuscleGroup, request.Notes), ct));

    [HttpPost("{id:guid}/exercises/{exId:guid}/sets")]
    [ProducesResponseType(typeof(WorkoutSessionSetDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionSetDto>> AddSet(Guid id, Guid exId, [FromBody] AddSetRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddSetCommand(
            UserId, id, exId, request.Weight, request.Repetitions, request.DurationSeconds), ct));

    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType(typeof(WorkoutSessionSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionSummaryDto>> Complete(Guid id, [FromBody] CompleteSessionRequest? request, CancellationToken ct)
        => Ok(await mediator.Send(new CompleteWorkoutSessionCommand(UserId, id, request?.Notes), ct));

    [HttpPost("{id:guid}/abandon")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> Abandon(Guid id, CancellationToken ct)
    {
        await mediator.Send(new AbandonWorkoutSessionCommand(UserId, id), ct);
        return NoContent();
    }

    [HttpGet("week-status")]
    [ProducesResponseType(typeof(WeekStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WeekStatusDto>> GetWeekStatus(CancellationToken ct)
        => Ok(await mediator.Send(new GetWeekStatusQuery(UserId), ct));

    [HttpGet("active")]
    [ProducesResponseType(typeof(WorkoutSessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSessionDto?>> GetActive(CancellationToken ct)
        => Ok(await mediator.Send(new GetActiveWorkoutSessionQuery(UserId), ct));

    [HttpGet]
    [ProducesResponseType(typeof(Application.Common.PagedResult<WorkoutSessionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<Application.Common.PagedResult<WorkoutSessionDto>>> GetHistory(
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetWorkoutSessionHistoryQuery(UserId, fromDate, toDate, page, pageSize), ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WorkoutSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkoutSessionDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutSessionByIdQuery(UserId, id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("previous/{exerciseName}")]
    [ProducesResponseType(typeof(PreviousExerciseDataDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PreviousExerciseDataDto>> GetPreviousExerciseData(string exerciseName, CancellationToken ct)
    {
        var result = await mediator.Send(new GetPreviousExerciseDataQuery(UserId, exerciseName), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("estimate")]
    [ProducesResponseType(typeof(WorkoutDurationEstimateDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutDurationEstimateDto>> GetEstimate([FromQuery] Guid sourceDayId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutDurationEstimateQuery(UserId, sourceDayId), ct));

    [HttpGet("settings/rest-timer")]
    [ProducesResponseType(typeof(RestTimerSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestTimerSettingsDto>> GetRestTimerSettings(CancellationToken ct)
        => Ok(await mediator.Send(new GetRestTimerSettingsQuery(UserId), ct));

    [HttpPut("settings/rest-timer")]
    [ProducesResponseType(typeof(RestTimerSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RestTimerSettingsDto>> UpdateRestTimerSettings([FromBody] UpdateRestTimerSettingsRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateRestTimerSettingsCommand(
            UserId, request.DefaultRestSeconds, request.AutoStartTimer,
            request.PlaySound, request.Vibrate, request.SoundAlertBeforeEndSeconds), ct));
}
