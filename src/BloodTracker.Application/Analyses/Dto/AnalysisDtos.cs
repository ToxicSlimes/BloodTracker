using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Analyses.Dto;

public sealed record AnalysisDto
{
    public Guid Id { get; init; }
    public DateTime Date { get; init; }
    public required string Label { get; init; }
    public string? Laboratory { get; init; }
    public string? Notes { get; init; }
    public Dictionary<string, double> Values { get; init; } = new();
}

public sealed record AnalysisValueDto
{
    public required string Key { get; init; }
    public required string Name { get; init; }
    public double Value { get; init; }
    public required string Unit { get; init; }
    public double RefMin { get; init; }
    public double RefMax { get; init; }
    public ValueStatus Status { get; init; }
}

public sealed record CreateAnalysisDto
{
    public DateTime Date { get; init; }
    public required string Label { get; init; }
    public string? Laboratory { get; init; }
    public string? Notes { get; init; }
    public Dictionary<string, double> Values { get; init; } = new();
}

public sealed record UpdateAnalysisDto
{
    public Guid Id { get; init; }
    public DateTime Date { get; init; }
    public required string Label { get; init; }
    public string? Laboratory { get; init; }
    public string? Notes { get; init; }
    public Dictionary<string, double> Values { get; init; } = new();
}

public sealed record CompareAnalysesDto
{
    public required AnalysisDto Before { get; init; }
    public required AnalysisDto After { get; init; }
    public List<ComparisonValueDto> Comparisons { get; init; } = new();
}

public sealed record ComparisonValueDto
{
    public required string Key { get; init; }
    public required string Name { get; init; }
    public required string Unit { get; init; }
    public double? BeforeValue { get; init; }
    public double? AfterValue { get; init; }
    public double? DeltaPercent { get; init; }
    public ValueStatus BeforeStatus { get; init; }
    public ValueStatus AfterStatus { get; init; }
}

public sealed record ImportPdfResultDto
{
    public bool Success { get; init; }
    public AnalysisDto? Analysis { get; init; }
    public string? ErrorMessage { get; init; }
    public int ParsedValuesCount { get; init; }
    public List<string> UnrecognizedItems { get; init; } = new();
    public string? DetectedLaboratory { get; init; }
    public DateTime? DetectedDate { get; init; }
}
