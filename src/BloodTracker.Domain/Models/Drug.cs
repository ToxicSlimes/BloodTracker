namespace BloodTracker.Domain.Models;

/// <summary>
/// Препарат курса
/// </summary>
public sealed class Drug : Entity
{
    public required string Name { get; set; }
    public required DrugType Type { get; set; }
    public string? Dosage { get; set; }
    public string? Amount { get; set; }
    public string? Schedule { get; set; }
    public string? Notes { get; set; }
    public Guid? CourseId { get; set; }
    public string? CatalogItemId { get; set; }
    public string? ManufacturerId { get; set; }
}
