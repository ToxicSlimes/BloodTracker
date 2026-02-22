namespace BloodTracker.Domain.Models.WorkoutDiary;

public sealed class WorkoutSessionSet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ExerciseId { get; set; }
    public Guid? SourceSetId { get; set; }
    public int OrderIndex { get; set; }

    public decimal? PlannedWeight { get; set; }
    public int? PlannedRepetitions { get; set; }
    public int? PlannedDurationSeconds { get; set; }

    public decimal? ActualWeight { get; set; }
    public decimal? ActualWeightKg { get; set; }
    public int? ActualRepetitions { get; set; }
    public int? ActualDurationSeconds { get; set; }
    public int? RPE { get; set; }
    public SetType Type { get; set; } = SetType.Working;
    public string? Notes { get; set; }

    public decimal? PreviousWeight { get; set; }
    public int? PreviousReps { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? RestAfterSeconds { get; set; }

    public decimal Tonnage => Type == SetType.Warmup ? 0 : (ActualWeightKg ?? 0) * (ActualRepetitions ?? 0);

    public decimal Estimated1RM => CalculateEstimated1RM();

    public SetComparison CompareWithPrevious()
    {
        if (PreviousWeight == null || PreviousReps == null) return SetComparison.NoPrevious;
        if (ActualWeight == null || ActualRepetitions == null) return SetComparison.NoPrevious;

        var prevTonnage = PreviousWeight.Value * PreviousReps.Value;
        var currentTonnage = ActualWeight.Value * ActualRepetitions.Value;

        if (currentTonnage > prevTonnage) return SetComparison.Better;
        if (currentTonnage == prevTonnage) return SetComparison.Same;
        return SetComparison.Worse;
    }

    private decimal CalculateEstimated1RM()
    {
        if (ActualWeightKg == null || ActualRepetitions == null || ActualRepetitions == 0)
            return 0;
        if (ActualRepetitions == 1) return ActualWeightKg.Value;
        if (ActualRepetitions > 12) return 0;

        var reps = (decimal)ActualRepetitions.Value;
        var weight = ActualWeightKg.Value;

        var epley = weight * (1 + reps / 30m);
        var brzycki = weight * 36m / (37m - reps);

        return (epley + brzycki) / 2m;
    }
}
