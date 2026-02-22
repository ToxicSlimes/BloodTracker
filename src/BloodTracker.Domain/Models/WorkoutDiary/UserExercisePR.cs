namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class UserExercisePR : Entity
{
    public required string UserId { get; set; }
    public required string ExerciseName { get; set; }
    public decimal? BestWeight { get; set; }
    public DateTime? BestWeightDate { get; set; }
    public decimal? BestE1RM { get; set; }
    public DateTime? BestE1RMDate { get; set; }
    public decimal? BestVolumeSingleSession { get; set; }
    public DateTime? BestVolumeDate { get; set; }
    public Dictionary<string, RepPREntry> RepPRsByWeight { get; set; } = new();
}

public sealed class RepPREntry
{
    public int Reps { get; set; }
    public DateTime Date { get; set; }
}
