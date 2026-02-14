using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Dto;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Queries;

public sealed record GetActiveWorkoutSessionQuery(string UserId) : IRequest<WorkoutSessionDto?>;

public sealed record GetWorkoutSessionHistoryQuery(
    string UserId,
    DateTime? FromDate,
    DateTime? ToDate,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<WorkoutSessionDto>>;

public sealed record GetWorkoutSessionByIdQuery(string UserId, Guid SessionId) : IRequest<WorkoutSessionDto?>;

public sealed record GetPreviousExerciseDataQuery(string UserId, string ExerciseName) : IRequest<PreviousExerciseDataDto?>;

public sealed record GetWorkoutDurationEstimateQuery(string UserId, Guid SourceDayId) : IRequest<WorkoutDurationEstimateDto>;

public sealed record GetWeekStatusQuery(string UserId) : IRequest<WeekStatusDto>;
