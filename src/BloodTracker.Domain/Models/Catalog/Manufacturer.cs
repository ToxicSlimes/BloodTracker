namespace BloodTracker.Domain.Models;

/// <summary>
/// Производитель препаратов (хранится в catalog.db)
/// </summary>
public sealed class Manufacturer
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? Country { get; init; }
    public ManufacturerType Type { get; init; }
    public string? Description { get; init; }
    public string? Website { get; init; }
    public bool IsPopular { get; init; }
    public int SortOrder { get; init; }
}
