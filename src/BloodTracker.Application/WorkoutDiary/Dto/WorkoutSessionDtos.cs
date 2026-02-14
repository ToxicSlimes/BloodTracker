using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;

namespace BloodTracker.Application.WorkoutDiary.Dto;

public sealed record WorkoutSessionDto
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = default!;
    public Guid? SourceProgramId { get; init; }
    public Guid? SourceDayId { get; init; }
    public required string Title { get; init; }
    public string? Notes { get; init; }
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int DurationSeconds { get; init; }
    public string Status { get; init; } = default!;
    public decimal TotalTonnage { get; init; }
    public int TotalVolume { get; init; }
    public int TotalSetsCompleted { get; init; }
    public decimal AverageIntensity { get; init; }
    public int AverageRestSeconds { get; init; }
    public List<WorkoutSessionExerciseDto> Exercises { get; init; } = new();
}

public sealed record WorkoutSessionExerciseDto
{
    public Guid Id { get; init; }
    public Guid? SourceExerciseId { get; init; }
    public required string Name { get; init; }
    public string MuscleGroup { get; init; } = default!;
    public string? Notes { get; init; }
    public int OrderIndex { get; init; }
    public bool IsCompleted { get; init; }
    public List<WorkoutSessionSetDto> Sets { get; init; } = new();
}

public sealed record WorkoutSessionSetDto
{
    public Guid Id { get; init; }
    public Guid? SourceSetId { get; init; }
    public int OrderIndex { get; init; }
    public decimal? PlannedWeight { get; init; }
    public int? PlannedRepetitions { get; init; }
    public int? PlannedDurationSeconds { get; init; }
    public decimal? ActualWeight { get; init; }
    public decimal? ActualWeightKg { get; init; }
    public int? ActualRepetitions { get; init; }
    public int? ActualDurationSeconds { get; init; }
    public int? RPE { get; init; }
    public string Type { get; init; } = default!;
    public string? Notes { get; init; }
    public decimal? PreviousWeight { get; init; }
    public int? PreviousReps { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int? RestAfterSeconds { get; init; }
    public decimal Tonnage { get; init; }
    public string Comparison { get; init; } = default!;
}

public sealed record WorkoutSessionSummaryDto
{
    public required WorkoutSessionDto Session { get; init; }
}

public sealed record StartWorkoutSessionRequest
{
    public Guid? SourceDayId { get; init; }
    public string? CustomTitle { get; init; }
    public string? Notes { get; init; }
    public bool RepeatLast { get; init; }
}

public sealed record CompleteSetRequest
{
    public decimal? Weight { get; init; }
    public decimal? WeightKg { get; init; }
    public int? Repetitions { get; init; }
    public int? DurationSeconds { get; init; }
    public int? RPE { get; init; }
    public SetType Type { get; init; } = SetType.Working;
    public string? Notes { get; init; }
}

public sealed record CompleteSessionRequest
{
    public string? Notes { get; init; }
}

public sealed record AddExerciseRequest
{
    public required string Name { get; init; }
    public MuscleGroup MuscleGroup { get; init; }
    public string? Notes { get; init; }
}

public sealed record AddSetRequest
{
    public decimal? Weight { get; init; }
    public int? Repetitions { get; init; }
    public int? DurationSeconds { get; init; }
}

public sealed record PreviousExerciseDataDto
{
    public required string ExerciseName { get; init; }
    public DateTime SessionDate { get; init; }
    public List<PreviousSetDto> Sets { get; init; } = new();
}

public sealed record PreviousSetDto
{
    public decimal? Weight { get; init; }
    public int? Repetitions { get; init; }
    public int? RPE { get; init; }
}

public sealed record WorkoutDurationEstimateDto
{
    public int EstimatedMinutes { get; init; }
    public int AverageRestSeconds { get; init; }
    public int TotalSets { get; init; }
}
