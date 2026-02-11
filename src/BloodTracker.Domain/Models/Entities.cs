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
