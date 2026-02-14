namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class WeeklyUserStats : Entity
{
    public required string UserId { get; set; }
    public int Year { get; set; }
    public int WeekNumber { get; set; }
    public int TotalSessions { get; set; }
    public int TotalSets { get; set; }
    public int TotalReps { get; set; }
    public decimal TotalTonnage { get; set; }
    public int TotalDurationSeconds { get; set; }
    public int AverageRestSeconds { get; set; }
}
