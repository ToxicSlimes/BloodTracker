namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class WorkoutSessionExercise
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid? SourceExerciseId { get; set; }
    public required string Name { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public string? Notes { get; set; }
    public int OrderIndex { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<WorkoutSessionSet> Sets { get; set; } = new();
    public bool IsCompleted => Sets.Count > 0 && Sets.All(s => s.CompletedAt != null);
}
