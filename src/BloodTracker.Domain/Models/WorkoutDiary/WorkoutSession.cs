namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class WorkoutSession : Entity
{
    public required string UserId { get; set; }
    public Guid? SourceProgramId { get; set; }
    public Guid? SourceDayId { get; set; }
    public required string Title { get; set; }
    public string? Notes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int DurationSeconds { get; set; }
    public WorkoutSessionStatus Status { get; set; } = WorkoutSessionStatus.InProgress;
    public decimal TotalTonnage { get; set; }
    public int TotalVolume { get; set; }
    public int TotalSetsCompleted { get; set; }
    public decimal AverageIntensity { get; set; }
    public int AverageRestSeconds { get; set; }
    public List<WorkoutSessionExercise> Exercises { get; set; } = new();
}
