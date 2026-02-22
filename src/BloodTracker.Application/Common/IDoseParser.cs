using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Common;

public sealed record DoseResult
{
    public required double DoseValue { get; init; }
    public required DoseUnit DoseUnit { get; init; }
    public required double DoseMultiplier { get; init; }
    public required double ConsumedAmount { get; init; }
    public required DoseUnit ConsumedUnit { get; init; }
    public required string DisplayText { get; init; }
}

public interface IDoseParser
{
    DoseResult? Parse(string input, Drug drug);
}
