using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Queries;

public sealed record GetExerciseProgressQuery(
    string UserId, string ExerciseName, DateTime? From, DateTime? To) : IRequest<ExerciseProgressDto>;

public sealed record GetMuscleGroupProgressQuery(
    string UserId, MuscleGroup MuscleGroup, DateTime? From, DateTime? To) : IRequest<MuscleGroupProgressDto>;

public sealed record GetPersonalRecordsQuery(
    string UserId, string? ExerciseName, int Page, int PageSize) : IRequest<PagedResult<PersonalRecordLogDto>>;

public sealed record GetWorkoutStatsQuery(
    string UserId, DateTime? From, DateTime? To) : IRequest<WorkoutStatsDto>;

public sealed record GetStrengthLevelQuery(
    string UserId, string ExerciseId, decimal Bodyweight, string Gender) : IRequest<StrengthLevelDto?>;

public sealed record GetWorkoutCalendarQuery(
    string UserId, DateTime From, DateTime To) : IRequest<List<DateTime>>;

public sealed record GetAllExercisePRsQuery(
    string UserId) : IRequest<List<UserExercisePRDto>>;

public sealed record GetAllMuscleGroupStatsQuery(
    string UserId, DateTime? From, DateTime? To) : IRequest<AllMuscleGroupsStatsDto>;
