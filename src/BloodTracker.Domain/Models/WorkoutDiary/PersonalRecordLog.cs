namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class PersonalRecordLog : Entity
{
    public required string UserId { get; set; }
    public required string ExerciseName { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public PersonalRecordType RecordType { get; set; }
    public decimal Value { get; set; }
    public decimal? PreviousValue { get; set; }
    public DateTime? PreviousDate { get; set; }
    public decimal ImprovementPercent { get; set; }
    public Guid SessionId { get; set; }
    public Guid SetId { get; set; }
    public DateTime AchievedAt { get; set; }
}
