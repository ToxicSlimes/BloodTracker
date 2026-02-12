namespace BloodTracker.Domain.Models;

/// <summary>Фармакологические свойства субстанции</summary>
public sealed record PharmacologyInfo
{
    /// <summary>Период полураспада</summary>
    public string? HalfLife { get; init; }

    /// <summary>Время обнаружения на допинг-тесте</summary>
    public string? DetectionTime { get; init; }

    /// <summary>Анаболический рейтинг (тестостерон = 100)</summary>
    public int? AnabolicRating { get; init; }

    /// <summary>Андрогенный рейтинг (тестостерон = 100)</summary>
    public int? AndrogenicRating { get; init; }

    /// <summary>Типичные дозировки</summary>
    public string? CommonDosages { get; init; }
}
