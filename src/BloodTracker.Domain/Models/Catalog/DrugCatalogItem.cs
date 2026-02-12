namespace BloodTracker.Domain.Models;

/// <summary>
/// Элемент каталога препаратов (хранится в catalog.db)
/// </summary>
public sealed class DrugCatalogItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? NameEn { get; init; }
    public DrugCategory Category { get; init; }
    public DrugSubcategory Subcategory { get; init; }
    public DrugType DrugType { get; init; }
    public bool HasBothForms { get; init; }
    public string? ActiveSubstance { get; init; }
    public string? Description { get; init; }
    public string? Effects { get; init; }
    public string? SideEffects { get; init; }
    public string? HalfLife { get; init; }
    public string? DetectionTime { get; init; }
    public string? CommonDosages { get; init; }
    public string? Notes { get; init; }
    public bool IsPopular { get; init; }
    public int SortOrder { get; init; }
    public int? AnabolicRating { get; init; }
    public int? AndrogenicRating { get; init; }
    public string? PubMedSearchTerm { get; init; }
}
