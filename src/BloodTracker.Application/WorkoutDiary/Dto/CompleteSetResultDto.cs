namespace BloodTracker.Application.WorkoutDiary.Dto;

public sealed record CompleteSetResultDto
{
    public required WorkoutSessionSetDto Set { get; init; }
    public bool IsNewPR { get; init; }
    public List<PRDetailDto> NewPRs { get; init; } = new();
}

public sealed record PRDetailDto
{
    public required string RecordType { get; init; }
    public decimal Value { get; init; }
    public decimal? PreviousValue { get; init; }
    public decimal ImprovementPercent { get; init; }
    public required string ExerciseName { get; init; }
}
