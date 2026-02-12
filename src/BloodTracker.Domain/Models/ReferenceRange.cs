namespace BloodTracker.Domain.Models;

/// <summary>
/// Референсные значения для показателя анализа
/// </summary>
public sealed record ReferenceRange
{
    public required string Key { get; init; }
    public required string Name { get; init; }
    public required double Min { get; init; }
    public required double Max { get; init; }
    public required string Unit { get; init; }
    public string? Category { get; init; }
    public string? Description { get; init; }
}
