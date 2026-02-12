namespace BloodTracker.Domain.Models;

/// <summary>Описание субстанции: текст, эффекты, побочки, заметки</summary>
public sealed record SubstanceDescription
{
    /// <summary>Основное описание субстанции</summary>
    public string? Text { get; init; }

    /// <summary>Основные эффекты</summary>
    public string? Effects { get; init; }

    /// <summary>Побочные эффекты</summary>
    public string? SideEffects { get; init; }

    /// <summary>Дополнительные заметки</summary>
    public string? Notes { get; init; }
}
