using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Commands;

public sealed record StartWorkoutSessionCommand(
    string UserId,
    Guid? SourceDayId,
    string? CustomTitle,
    string? Notes,
    bool RepeatLast) : IRequest<WorkoutSessionDto>;

public sealed record CompleteSetCommand(
    string UserId,
    Guid SessionId,
    Guid SetId,
    decimal? Weight,
    decimal? WeightKg,
    int? Repetitions,
    int? DurationSeconds,
    int? RPE,
    SetType Type,
    string? Notes) : IRequest<CompleteSetResultDto>;

public sealed record UndoLastSetCommand(
    string UserId,
    Guid SessionId) : IRequest<WorkoutSessionDto>;

public sealed record AddSetCommand(
    string UserId,
    Guid SessionId,
    Guid ExerciseId,
    decimal? Weight,
    int? Repetitions,
    int? DurationSeconds) : IRequest<WorkoutSessionSetDto>;

public sealed record AddExerciseCommand(
    string UserId,
    Guid SessionId,
    string Name,
    MuscleGroup MuscleGroup,
    string? Notes) : IRequest<WorkoutSessionExerciseDto>;

public sealed record CompleteWorkoutSessionCommand(
    string UserId,
    Guid SessionId,
    string? Notes) : IRequest<WorkoutSessionSummaryDto>;

public sealed record AbandonWorkoutSessionCommand(
    string UserId,
    Guid SessionId) : IRequest;

public sealed record UpdateRestTimerSettingsCommand(
    string UserId,
    int DefaultRestSeconds,
    bool AutoStartTimer,
    bool PlaySound,
    bool Vibrate,
    int SoundAlertBeforeEndSeconds) : IRequest<RestTimerSettingsDto>;
