namespace BloodTracker.Domain.Models;

/// <summary>
/// Элемент каталога упражнений
/// </summary>
public sealed class ExerciseCatalogEntry
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public string? BodyPart { get; set; }
    public string? Target { get; set; }
    public string? Equipment { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public DateTime CachedAt { get; set; }
}
