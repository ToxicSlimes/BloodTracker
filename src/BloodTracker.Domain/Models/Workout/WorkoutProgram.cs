namespace BloodTracker.Domain.Models;

/// <summary>
/// Тренировочная программа
/// </summary>
public sealed class WorkoutProgram : Entity
{
    public required string Title { get; set; }
    public string? Notes { get; set; }
}
