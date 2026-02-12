namespace BloodTracker.Domain.Models;

/// <summary>
/// Подход упражнения
/// </summary>
public sealed class WorkoutSet : Entity
{
    public required Guid ExerciseId { get; set; }
    public int? Repetitions { get; set; }
    public double? Weight { get; set; }
    public TimeSpan? Duration { get; set; }
    public string? Notes { get; set; }
}
