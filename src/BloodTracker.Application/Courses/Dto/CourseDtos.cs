using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Courses.Dto;

public sealed record CourseDto
{
    public Guid Id { get; init; }
    public required string Title { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? Notes { get; init; }
    public bool IsActive { get; init; }
    public int CurrentDay { get; init; }
    public int TotalDays { get; init; }
}

public sealed record DrugDto
{
    public Guid Id { get; init; }
    public required string Name { get; init; }
    public DrugType Type { get; init; }
    public string? Dosage { get; init; }
    public string? Amount { get; init; }
    public string? Schedule { get; init; }
    public string? Notes { get; init; }
    public Guid? CourseId { get; init; }
    public string? CatalogItemId { get; init; }
    public string? ManufacturerId { get; init; }
    public string? ManufacturerName { get; init; }
    public double? StandardDoseValue { get; init; }
    public DoseUnit? StandardDoseUnit { get; init; }
    public double? ConcentrationMgPerMl { get; init; }
    public double? PackageSize { get; init; }
    public DoseUnit? PackageUnit { get; init; }
}

public sealed record IntakeLogDto
{
    public Guid Id { get; init; }
    public DateTime Date { get; init; }
    public Guid DrugId { get; init; }
    public required string DrugName { get; init; }
    public string? Dose { get; init; }
    public string? Note { get; init; }
    public Guid? PurchaseId { get; init; }
    public string? PurchaseLabel { get; init; }
    public double? DoseValue { get; init; }
    public DoseUnit? DoseUnit { get; init; }
    public double? DoseMultiplier { get; init; }
    public double? ConsumedAmount { get; init; }
    public DoseUnit? ConsumedUnit { get; init; }
}

public sealed record CreateCourseDto
{
    public required string Title { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? Notes { get; init; }
}

public sealed record CreateDrugDto
{
    public required string Name { get; init; }
    public DrugType Type { get; init; }
    public string? Dosage { get; init; }
    public string? Amount { get; init; }
    public string? Schedule { get; init; }
    public string? Notes { get; init; }
    public Guid? CourseId { get; init; }
    public string? CatalogItemId { get; init; }
    public string? ManufacturerId { get; init; }
    public double? StandardDoseValue { get; init; }
    public DoseUnit? StandardDoseUnit { get; init; }
    public double? ConcentrationMgPerMl { get; init; }
    public double? PackageSize { get; init; }
    public DoseUnit? PackageUnit { get; init; }
}

public sealed record UpdateDrugDto
{
    public required string Name { get; init; }
    public DrugType Type { get; init; }
    public string? Dosage { get; init; }
    public string? Amount { get; init; }
    public string? Schedule { get; init; }
    public string? Notes { get; init; }
    public Guid? CourseId { get; init; }
    public string? CatalogItemId { get; init; }
    public string? ManufacturerId { get; init; }
    public double? StandardDoseValue { get; init; }
    public DoseUnit? StandardDoseUnit { get; init; }
    public double? ConcentrationMgPerMl { get; init; }
    public double? PackageSize { get; init; }
    public DoseUnit? PackageUnit { get; init; }
}

public sealed record CreateIntakeLogDto
{
    public DateTime Date { get; init; }
    public Guid DrugId { get; init; }
    public string? Dose { get; init; }
    public string? Note { get; init; }
    public Guid? PurchaseId { get; init; }
    public double? DoseValue { get; init; }
    public DoseUnit? DoseUnit { get; init; }
    public double? DoseMultiplier { get; init; }
}

public sealed record UpdateIntakeLogDto
{
    public DateTime Date { get; init; }
    public Guid DrugId { get; init; }
    public string? Dose { get; init; }
    public string? Note { get; init; }
    public Guid? PurchaseId { get; init; }
    public double? DoseValue { get; init; }
    public DoseUnit? DoseUnit { get; init; }
    public double? DoseMultiplier { get; init; }
}

public sealed record DashboardDto
{
    public CourseDto? ActiveCourse { get; init; }
    public List<DrugDto> Drugs { get; init; } = [];
    public List<IntakeLogDto> RecentIntakes { get; init; } = [];
    public int AnalysesCount { get; init; }
    public DateTime? LastAnalysisDate { get; init; }
}
