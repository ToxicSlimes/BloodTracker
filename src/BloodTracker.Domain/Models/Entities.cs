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
    public string? CatalogItemId { get; set; }
    public string? ManufacturerId { get; set; }
}

public enum DrugType
{
    Oral,
    Injectable,
    Subcutaneous,
    Transdermal,
    Nasal
}

public enum DrugCategory
{
    AAS,
    Peptide,
    SARM,
    PCT,
    FatBurner,
    GrowthHormone,
    AntiEstrogen,
    Insulin,
    Prohormone,
    DopamineAgonist,
    Other
}

public enum DrugSubcategory
{
    None,
    Testosterone,
    Nandrolone,
    Trenbolone,
    Boldenone,
    Drostanolone,
    Methenolone,
    OralAAS,
    GHRP,
    GHRH,
    HealingPeptide,
    Melanotropin,
    GLP1Agonist,
    Thyroid,
    AromataseInhibitor,
    SERM,
    General
}

public enum ManufacturerType
{
    Pharmaceutical,
    UGL
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
    public Guid? PurchaseId { get; set; }
}

/// <summary>
/// Покупка препарата
/// </summary>
public sealed class Purchase : Entity
{
    public required Guid DrugId { get; set; }
    public required string DrugName { get; set; }
    public required DateTime PurchaseDate { get; set; }
    public required int Quantity { get; set; }
    public decimal Price { get; set; }
    public string? Vendor { get; set; }
    public string? Notes { get; set; }
    public string? ManufacturerId { get; set; }
    public string? ManufacturerName { get; set; }
}

/// <summary>
/// Тренировочная программа
/// </summary>
public sealed class WorkoutProgram : Entity
{
    public required string Title { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// День тренировочной программы
/// </summary>
public sealed class WorkoutDay : Entity
{
    public required Guid ProgramId { get; set; }
    public required DayOfWeek DayOfWeek { get; set; }
    public string? Title { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Упражнение тренировочного дня
/// </summary>
public sealed class WorkoutExercise : Entity
{
    public required Guid ProgramId { get; set; }
    public required Guid DayId { get; set; }
    public required string Name { get; set; }
    public MuscleGroup MuscleGroup { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Подход упражнения
/// </summary>
public sealed class WorkoutSet : Entity
{
    public required Guid ExerciseId { get; set; }
    public int? Repetitions { get; set; }
    public double? Weight { get; set; }
    public TimeSpan? Duration { get; set; }
    public string? Notes { get; set; }
}

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

/// <summary>
/// Производитель препаратов (хранится в catalog.db)
/// </summary>
public sealed class Manufacturer
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? Country { get; init; }
    public ManufacturerType Type { get; init; }
    public string? Description { get; init; }
    public string? Website { get; init; }
    public bool IsPopular { get; init; }
    public int SortOrder { get; init; }
}

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

/// <summary>
/// Пользователь системы (хранится в auth.db)
/// </summary>
public sealed class AppUser
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Email { get; init; } = "";
    public string? DisplayName { get; set; }
    public string? GoogleId { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}

/// <summary>
/// Код авторизации по email (хранится в auth.db)
/// </summary>
public sealed class AuthCode
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Email { get; init; } = "";
    public string Code { get; init; } = "";
    public DateTime ExpiresAt { get; init; }
    public bool Used { get; set; }
}

public enum MuscleGroup
{
    FullBody,
    Chest,
    Back,
    Shoulders,
    Biceps,
    Triceps,
    Forearms,
    Abs,
    Glutes,
    Quadriceps,
    Hamstrings,
    Calves
}
