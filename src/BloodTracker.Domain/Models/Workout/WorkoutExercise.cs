namespace BloodTracker.Domain.Models;

/// <summary>
/// Упражнение тренировочного дня
/// </summary>
public sealed class WorkoutExercise : Entity
{
    public required Guid ProgramId { get; set; }
    public required Guid DayId { get; set; }
    public required string Name { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public string? Notes { get; set; }
}
