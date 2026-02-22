namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class DailyExerciseStats : Entity
{
    public required string UserId { get; set; }
    public DateTime Date { get; set; }
    public required string ExerciseName { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public int TotalSets { get; set; }
    public int TotalReps { get; set; }
    public decimal TotalTonnage { get; set; }
    public decimal MaxWeight { get; set; }
    public decimal BestEstimated1RM { get; set; }
    public int AverageRPE { get; set; }
}
