namespace BloodTracker.Domain.Models;

public abstract class Entity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

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

/// <summary>
/// Курс препаратов
/// </summary>
public sealed class Course : Entity
{
    public required string Title { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

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
}

public enum DrugType
{
    Oral,
    Injectable
}

/// <summary>
/// Запись о приёме препарата
/// </summary>
public sealed class IntakeLog : Entity
{
    public required DateTime Date { get; set; }
    public required Guid DrugId { get; set; }
    public required string DrugName { get; set; }
    public string? Dose { get; set; }
    public string? Note { get; set; }
}

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

public enum ValueStatus
{
    Normal,
    Low,
    SlightlyHigh,
    High,
    Pending
}
