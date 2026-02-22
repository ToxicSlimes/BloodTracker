namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class WeeklyMuscleVolume : Entity
{
    public required string UserId { get; set; }
    public int Year { get; set; }
    public int WeekNumber { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public int TotalSets { get; set; }
    public int TotalReps { get; set; }
    public decimal TotalTonnage { get; set; }
}
