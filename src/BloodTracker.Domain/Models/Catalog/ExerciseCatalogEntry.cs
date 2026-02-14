namespace BloodTracker.Domain.Models;

public sealed class ExerciseCatalogEntry
{
    public required string Id { get; set; }
    public required string NameRu { get; set; }
    public required string NameEn { get; set; }
    public string? BodyPart { get; set; }
    public string? Target { get; set; }
    public string? Equipment { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public List<MuscleGroup> SecondaryMuscles { get; set; } = new();
    public string ExerciseType { get; set; } = "Compound";
    public string Category { get; set; } = "Strength";
    public string? Instructions { get; set; }
}
