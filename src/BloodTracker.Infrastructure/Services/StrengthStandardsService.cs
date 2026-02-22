using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using BloodTracker.Application.Common;

namespace BloodTracker.Infrastructure.Services;

internal sealed class StrengthStandardsFileData
{
    [JsonPropertyName("version")]
    public int Version { get; set; }

    [JsonPropertyName("standards")]
    public Dictionary<string, StrengthStandardsFileEntry> Standards { get; set; } = new();

    [JsonPropertyName("levels")]
    public string[] Levels { get; set; } = [];

    [JsonPropertyName("percentiles")]
    public int[] Percentiles { get; set; } = [];
}

internal sealed class StrengthStandardsFileEntry
{
    [JsonPropertyName("male")]
    public decimal[] Male { get; set; } = [];

    [JsonPropertyName("female")]
    public decimal[] Female { get; set; } = [];
}

public sealed class StrengthStandardsService : IStrengthStandardsService
{
    private static Dictionary<string, StrengthStandardEntry>? _cachedStandards;
    private static readonly object _lock = new();

    private Dictionary<string, StrengthStandardEntry> GetStandards()
    {
        if (_cachedStandards != null) return _cachedStandards;

        lock (_lock)
        {
            if (_cachedStandards != null) return _cachedStandards;

            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("BloodTracker.Infrastructure.Data.strength-standards.json")
                ?? throw new InvalidOperationException("strength-standards.json embedded resource not found");

            var data = JsonSerializer.Deserialize<StrengthStandardsFileData>(stream)
                ?? throw new InvalidOperationException("Failed to deserialize strength standards");

            _cachedStandards = data.Standards.ToDictionary(
                kvp => kvp.Key,
                kvp => new StrengthStandardEntry { Male = kvp.Value.Male, Female = kvp.Value.Female });
        }

        return _cachedStandards;
    }

    public StrengthStandardEntry? GetStandard(string exerciseId)
        => GetStandards().GetValueOrDefault(exerciseId);

    public IReadOnlyList<string> GetSupportedExerciseIds()
        => GetStandards().Keys.ToList().AsReadOnly();
}
