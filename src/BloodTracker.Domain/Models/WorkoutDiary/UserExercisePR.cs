namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class UserExercisePR : Entity
{
    public required string UserId { get; set; }
    public required string ExerciseName { get; set; }
    public decimal MaxWeightKg { get; set; }
    public DateTime MaxWeightDate { get; set; }
    public decimal BestEstimated1RM { get; set; }
    public DateTime Best1RMDate { get; set; }
    public List<RepBracketPR> RepBrackets { get; set; } = new();
}

public sealed class RepBracketPR
{
    public int Reps { get; set; }
    public decimal WeightKg { get; set; }
    public DateTime AchievedAt { get; set; }
}
