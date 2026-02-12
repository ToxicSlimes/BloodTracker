namespace BloodTracker.Domain.Models;

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
