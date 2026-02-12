using System.Reflection;
using System.Text.Json;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Services;

public sealed class ReferenceRangeService : IReferenceRangeService
{
    private readonly Dictionary<string, ReferenceRange> _ranges;

    public ReferenceRangeService()
    {
        _ranges = LoadFromJson();
    }

    public ReferenceRange? GetRange(string key) => _ranges.GetValueOrDefault(key);

    public IReadOnlyList<ReferenceRange> GetAllRanges() => _ranges.Values.ToList();

    public ValueStatus GetStatus(string key, double value)
    {
        if (!_ranges.TryGetValue(key, out var range))
            return ValueStatus.Pending;

        var margin = (range.Max - range.Min) * 0.1;

        if (value < range.Min) return ValueStatus.Low;
        if (value > range.Max + margin) return ValueStatus.High;
        if (value > range.Max) return ValueStatus.SlightlyHigh;
        return ValueStatus.Normal;
    }

    private static Dictionary<string, ReferenceRange> LoadFromJson()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = "BloodTracker.Infrastructure.Data.reference-ranges.json";

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
            throw new InvalidOperationException($"Embedded resource not found: {resourceName}");

        using var reader = new StreamReader(stream);
        var json = reader.ReadToEnd();

        var data = JsonSerializer.Deserialize<ReferenceRangeData>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new InvalidOperationException("Failed to deserialize reference ranges");

        return data.Ranges.ToDictionary(r => r.Key, r => r);
    }

    private sealed class ReferenceRangeData
    {
        public int Version { get; set; }
        public List<ReferenceRange> Ranges { get; set; } = [];
    }
}
