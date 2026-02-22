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
    public double? StandardDoseValue { get; set; }
    public DoseUnit? StandardDoseUnit { get; set; }
    public double? ConcentrationMgPerMl { get; set; }
    public double? PackageSize { get; set; }
    public DoseUnit? PackageUnit { get; set; }
}
