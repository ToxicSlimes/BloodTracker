namespace BloodTracker.Domain.Models;

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
    public Guid? PurchaseId { get; set; }
}
