using BloodTracker.Domain.Models;

namespace BloodTracker.Application.WorkoutDiary.Dto;

public sealed record ExerciseProgressDto
{
    public required string ExerciseName { get; init; }
    public List<ExerciseProgressPointDto> DataPoints { get; init; } = new();
    public UserExercisePRDto? CurrentPR { get; init; }
}

public sealed record ExerciseProgressPointDto
{
    public DateTime Date { get; init; }
    public decimal MaxWeight { get; init; }
    public decimal BestEstimated1RM { get; init; }
    public int TotalSets { get; init; }
    public int TotalReps { get; init; }
    public decimal TotalTonnage { get; init; }
    public int AverageRPE { get; init; }
}

public sealed record MuscleGroupProgressDto
{
    public MuscleGroup MuscleGroup { get; init; }
    public List<MuscleGroupProgressPointDto> Weekly { get; init; } = new();
}

public sealed record MuscleGroupProgressPointDto
{
    public int Year { get; init; }
    public int Week { get; init; }
    public int TotalSets { get; init; }
    public int TotalReps { get; init; }
    public decimal TotalTonnage { get; init; }
}

public sealed record PersonalRecordLogDto
{
    public Guid Id { get; init; }
    public required string ExerciseName { get; init; }
    public string MuscleGroup { get; init; } = default!;
    public required string RecordType { get; init; }
    public decimal Value { get; init; }
    public decimal? PreviousValue { get; init; }
    public decimal ImprovementPercent { get; init; }
    public DateTime AchievedAt { get; init; }
}

public sealed record UserExercisePRDto
{
    public required string ExerciseName { get; init; }
    public decimal? BestWeight { get; init; }
    public DateTime? BestWeightDate { get; init; }
    public decimal? BestE1RM { get; init; }
    public DateTime? BestE1RMDate { get; init; }
    public decimal? BestVolumeSingleSession { get; init; }
    public DateTime? BestVolumeDate { get; init; }
    public Dictionary<string, RepPREntryDto> RepPRsByWeight { get; init; } = new();
}

public sealed record RepPREntryDto
{
    public int Reps { get; init; }
    public DateTime Date { get; init; }
}

public sealed record WorkoutStatsDto
{
    public int TotalWorkouts { get; init; }
    public decimal TotalTonnage { get; init; }
    public int TotalVolume { get; init; }
    public int TotalDurationSeconds { get; init; }
    public int TotalPersonalRecords { get; init; }
    public decimal AvgTonnagePerWorkout { get; init; }
    public int AvgVolumePerWorkout { get; init; }
    public int AvgDurationSecondsPerWorkout { get; init; }
    public int AvgRestSeconds { get; init; }
    public decimal WorkoutsPerWeek { get; init; }
    public Dictionary<string, int> MuscleGroupFrequency { get; init; } = new();
    public List<WeeklyStatsPointDto> WeeklyTrend { get; init; } = new();
}

public sealed record WeeklyStatsPointDto
{
    public int Year { get; init; }
    public int Week { get; init; }
    public int Sessions { get; init; }
    public decimal Tonnage { get; init; }
    public int Volume { get; init; }
    public int DurationSeconds { get; init; }
}

public sealed record StrengthLevelDto
{
    public required string ExerciseName { get; init; }
    public required string Level { get; init; }
    public decimal Ratio { get; init; }
    public int Percentile { get; init; }
    public required string NextLevel { get; init; }
    public decimal NextTargetWeight { get; init; }
    public decimal CurrentE1RM { get; init; }
    public decimal Bodyweight { get; init; }
    public List<StrengthLevelThresholdDto> Thresholds { get; init; } = new();
}

public sealed record StrengthLevelThresholdDto
{
    public required string Level { get; init; }
    public decimal Weight { get; init; }
    public decimal Ratio { get; init; }
}

public sealed class MuscleGroupSummaryDto
{
    public string MuscleGroup { get; init; } = "";
    public double TotalTonnage { get; init; }
    public int TotalSets { get; init; }
    public int TotalReps { get; init; }
    public double AvgTonnagePerWorkout { get; init; }
    public double AvgSetsPerWorkout { get; init; }
}

public sealed class AllMuscleGroupsStatsDto
{
    public List<MuscleGroupSummaryDto> Groups { get; init; } = new();
    public double TotalTonnage { get; init; }
    public int TotalSets { get; init; }
    public int TotalReps { get; init; }
}
