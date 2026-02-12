using System.Text.Json;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class ExerciseCatalogService : IExerciseCatalogService
{
    private const string CacheKey = "ExerciseCatalog";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);
    private readonly ILogger<ExerciseCatalogService> _logger;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly string? _apiKey;
    private readonly string? _apiUrl;

    public ExerciseCatalogService(
        ILogger<ExerciseCatalogService> logger,
        IConfiguration configuration,
        HttpClient httpClient,
        IMemoryCache cache)
    {
        _logger = logger;
        _httpClient = httpClient;
        _cache = cache;
        _apiKey = configuration["ExerciseCatalog:ApiKey"] ?? Environment.GetEnvironmentVariable("EXERCISE_CATALOG_API_KEY");
        _apiUrl = configuration["ExerciseCatalog:ApiUrl"] ?? Environment.GetEnvironmentVariable("EXERCISE_CATALOG_API_URL");
    }

    public async Task<IReadOnlyList<ExerciseCatalogEntry>> GetCatalogAsync(CancellationToken ct = default)
    {
        // Check memory cache first
        if (_cache.TryGetValue<List<ExerciseCatalogEntry>>(CacheKey, out var cached) && cached is not null)
        {
            _logger.LogInformation("Using cached exercise catalog with {Count} entries", cached.Count);
            return cached;
        }

        // If cache miss, fetch from API
        var entries = await FetchFromApiAsync(ct);
        
        // Cache with 24h expiration
        if (entries.Count > 0)
        {
            _cache.Set(CacheKey, entries, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            });
            _logger.LogInformation("Cached {Count} exercise catalog entries for {Duration}h", entries.Count, CacheDuration.TotalHours);
        }

        return entries;
    }

    private async Task<List<ExerciseCatalogEntry>> FetchFromApiAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_apiUrl))
        {
            _logger.LogWarning("Exercise catalog API URL not configured. Returning empty catalog.");
            return new List<ExerciseCatalogEntry>();
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("Exercise catalog API key not configured. Please set ExerciseCatalog:ApiKey in appsettings.json");
            return new List<ExerciseCatalogEntry>();
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, _apiUrl);
            request.Headers.Add("X-RapidAPI-Key", _apiKey);
            request.Headers.Add("X-RapidAPI-Host", "exercisedb.p.rapidapi.com");

            var response = await _httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Exercise catalog API error: {StatusCode} - {Error}", response.StatusCode, error);
                return new List<ExerciseCatalogEntry>();
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var apiItems = JsonSerializer.Deserialize<List<ExerciseCatalogApiItem>>(json, JsonOptions) ?? new List<ExerciseCatalogApiItem>();
            
            if (apiItems.Count == 0)
            {
                _logger.LogWarning("Exercise catalog API returned empty list.");
                return new List<ExerciseCatalogEntry>();
            }

            var now = DateTime.UtcNow;
            var mapped = apiItems
                .Where(item => !string.IsNullOrWhiteSpace(item.Name))
                .Select((item, index) => new ExerciseCatalogEntry
                {
                    Id = !string.IsNullOrWhiteSpace(item.Id) ? item.Id.Trim() : $"ex_{index}_{item.Name?.GetHashCode() ?? 0}",
                    Name = item.Name!.Trim(),
                    BodyPart = item.BodyPart?.Trim(),
                    Target = item.Target?.Trim(),
                    Equipment = item.Equipment?.Trim(),
                    MuscleGroup = MapToMuscleGroup(item.BodyPart, item.Target),
                    CachedAt = now
                })
                .ToList();

            if (mapped.Count == 0)
            {
                _logger.LogWarning("Exercise catalog API returned entries without valid names.");
                return new List<ExerciseCatalogEntry>();
            }

            _logger.LogInformation("Fetched {Count} exercise catalog entries from API", mapped.Count);
            return mapped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch exercise catalog from API.");
            return new List<ExerciseCatalogEntry>();
        }
    }

    private static MuscleGroup MapToMuscleGroup(string? bodyPart, string? target)
    {
        var normalizedTarget = Normalize(target);
        if (normalizedTarget.Contains("biceps"))
            return MuscleGroup.Biceps;
        if (normalizedTarget.Contains("triceps"))
            return MuscleGroup.Triceps;
        if (normalizedTarget.Contains("forearm"))
            return MuscleGroup.Forearms;
        if (normalizedTarget.Contains("delt") || normalizedTarget.Contains("shoulder"))
            return MuscleGroup.Shoulders;
        if (normalizedTarget.Contains("pectorals") || normalizedTarget.Contains("chest"))
            return MuscleGroup.Chest;
        if (normalizedTarget.Contains("lats") || normalizedTarget.Contains("upper back") || normalizedTarget.Contains("traps") ||
            normalizedTarget.Contains("back") || normalizedTarget.Contains("spine"))
            return MuscleGroup.Back;
        if (normalizedTarget.Contains("abs") || normalizedTarget.Contains("waist") || normalizedTarget.Contains("core") ||
            normalizedTarget.Contains("serratus"))
            return MuscleGroup.Abs;
        if (normalizedTarget.Contains("glute") || normalizedTarget.Contains("abductor") || normalizedTarget.Contains("adductor"))
            return MuscleGroup.Glutes;
        if (normalizedTarget.Contains("hamstring"))
            return MuscleGroup.Hamstrings;
        if (normalizedTarget.Contains("quad"))
            return MuscleGroup.Quadriceps;
        if (normalizedTarget.Contains("calf"))
            return MuscleGroup.Calves;
        if (normalizedTarget.Contains("cardio") || normalizedTarget.Contains("cardiovascular"))
            return MuscleGroup.FullBody;

        var normalizedBodyPart = Normalize(bodyPart);
        if (normalizedBodyPart.Contains("chest"))
            return MuscleGroup.Chest;
        if (normalizedBodyPart.Contains("back"))
            return MuscleGroup.Back;
        if (normalizedBodyPart.Contains("shoulder"))
            return MuscleGroup.Shoulders;
        if (normalizedBodyPart.Contains("upper arms"))
            return MuscleGroup.Biceps;
        if (normalizedBodyPart.Contains("lower arms"))
            return MuscleGroup.Forearms;
        if (normalizedBodyPart.Contains("waist"))
            return MuscleGroup.Abs;
        if (normalizedBodyPart.Contains("upper legs"))
            return MuscleGroup.Quadriceps;
        if (normalizedBodyPart.Contains("lower legs"))
            return MuscleGroup.Calves;
        if (normalizedBodyPart.Contains("glute"))
            return MuscleGroup.Glutes;
        if (normalizedBodyPart.Contains("hamstring"))
            return MuscleGroup.Hamstrings;
        if (normalizedBodyPart.Contains("cardio"))
            return MuscleGroup.FullBody;

        return MuscleGroup.FullBody;
    }

    private static string Normalize(string? value)
        => value?.Trim().ToLowerInvariant() ?? string.Empty;

    private sealed record ExerciseCatalogApiItem
    {
        public string? Id { get; init; }
        public string? Name { get; init; }
        public string? BodyPart { get; init; }
        public string? Target { get; init; }
        public string? Equipment { get; init; }
    }
}
