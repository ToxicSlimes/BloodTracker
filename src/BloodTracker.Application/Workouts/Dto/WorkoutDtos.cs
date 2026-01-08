using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Workouts.Dto;

public sealed record WorkoutProgramDto
{
    public Guid Id { get; init; }
    public required string Title { get; init; }
    public string? Notes { get; init; }
}

public sealed record WorkoutDayDto
{
    public Guid Id { get; init; }
    public Guid ProgramId { get; init; }
    public DayOfWeek DayOfWeek { get; init; }
    public string? Title { get; init; }
    public string? Notes { get; init; }
}

public sealed record WorkoutExerciseDto
{
    public Guid Id { get; init; }
    public Guid ProgramId { get; init; }
    public Guid DayId { get; init; }
    public required string Name { get; init; }
    public MuscleGroup MuscleGroup { get; init; }
    public string? Notes { get; init; }
}

public sealed record WorkoutSetDto
{
    public Guid Id { get; init; }
    public Guid ExerciseId { get; init; }
    public int? Repetitions { get; init; }
    public double? Weight { get; init; }
    public TimeSpan? Duration { get; init; }
    public string? Notes { get; init; }
}

public sealed record CreateWorkoutProgramDto
{
    public required string Title { get; init; }
    public string? Notes { get; init; }
}

public sealed record UpdateWorkoutProgramDto
{
    public required string Title { get; init; }
    public string? Notes { get; init; }
}

public sealed record CreateWorkoutDayDto
{
    public Guid ProgramId { get; init; }
    public DayOfWeek DayOfWeek { get; init; }
    public string? Title { get; init; }
    public string? Notes { get; init; }
}

public sealed record UpdateWorkoutDayDto
{
    public Guid ProgramId { get; init; }
    public DayOfWeek DayOfWeek { get; init; }
    public string? Title { get; init; }
    public string? Notes { get; init; }
}

public sealed record CreateWorkoutExerciseDto
{
    public Guid ProgramId { get; init; }
    public Guid DayId { get; init; }
    public required string Name { get; init; }
    public MuscleGroup MuscleGroup { get; init; }
    public string? Notes { get; init; }
}

public sealed record UpdateWorkoutExerciseDto
{
    public Guid ProgramId { get; init; }
    public Guid DayId { get; init; }
    public required string Name { get; init; }
    public MuscleGroup MuscleGroup { get; init; }
    public string? Notes { get; init; }
}

public sealed record CreateWorkoutSetDto
{
    public Guid ExerciseId { get; init; }
    public int? Repetitions { get; init; }
    public double? Weight { get; init; }
    public TimeSpan? Duration { get; init; }
    public string? Notes { get; init; }
}

public sealed record UpdateWorkoutSetDto
{
    public Guid ExerciseId { get; init; }
    public int? Repetitions { get; init; }
    public double? Weight { get; init; }
    public TimeSpan? Duration { get; init; }
    public string? Notes { get; init; }
}
