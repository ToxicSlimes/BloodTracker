namespace BloodTracker.Domain.Models;

/// <summary>
/// Результаты анализа крови
/// </summary>
public sealed class Analysis : Entity
{
    public required DateTime Date { get; set; }
    public required string Label { get; set; }
    public string? Laboratory { get; set; }
    public string? Notes { get; set; }
    public Dictionary<string, double> Values { get; set; } = new();
}
