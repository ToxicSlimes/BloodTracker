namespace BloodTracker.Domain.Models;

/// <summary>
/// День тренировочной программы
/// </summary>
public sealed class WorkoutDay : Entity
{
    public required Guid ProgramId { get; set; }
    public required DayOfWeek DayOfWeek { get; set; }
    public string? Title { get; set; }
    public string? Notes { get; set; }
}
