using System.Text.Json;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class ExerciseCatalogService : IExerciseCatalogService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);
    private readonly ILogger<ExerciseCatalogService> _logger;
    private readonly HttpClient _httpClient;
    private readonly BloodTrackerDbContext _dbContext;
    private readonly string? _apiKey;
    private readonly string? _apiUrl;

    public ExerciseCatalogService(
        ILogger<ExerciseCatalogService> logger,
        IConfiguration configuration,
        HttpClient httpClient,
        BloodTrackerDbContext dbContext)
    {
        _logger = logger;
        _httpClient = httpClient;
        _dbContext = dbContext;
        _apiKey = configuration["ExerciseCatalog:ApiKey"] ?? Environment.GetEnvironmentVariable("EXERCISE_CATALOG_API_KEY");
        _apiUrl = configuration["ExerciseCatalog:ApiUrl"] ?? Environment.GetEnvironmentVariable("EXERCISE_CATALOG_API_URL");
    }

    public async Task<IReadOnlyList<ExerciseCatalogEntry>> GetCatalogAsync(CancellationToken ct = default)
    {
        var cached = GetCachedEntries();
        if (IsCacheFresh(cached))
        {
            _logger.LogInformation("Using cached exercise catalog with {Count} entries", cached.Count);
            return cached;
        }

        if (string.IsNullOrWhiteSpace(_apiUrl))
        {
            _logger.LogWarning("Exercise catalog API URL not configured. Returning {Count} cached entries.", cached.Count);
            return cached;
        }

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, _apiUrl);
            if (!string.IsNullOrWhiteSpace(_apiKey))
            {
                request.Headers.Add("X-Api-Key", _apiKey);
            }

            var response = await _httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Exercise catalog API error: {StatusCode} - {Error}", response.StatusCode, error);
                return cached;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var apiItems = JsonSerializer.Deserialize<List<ExerciseCatalogApiItem>>(json, JsonOptions) ?? new List<ExerciseCatalogApiItem>();
            if (apiItems.Count == 0)
            {
                _logger.LogWarning("Exercise catalog API returned empty list. Returning {Count} cached entries.", cached.Count);
                return cached;
            }

            var now = DateTime.UtcNow;
            var mapped = apiItems
                .Where(item => !string.IsNullOrWhiteSpace(item.Id) && !string.IsNullOrWhiteSpace(item.Name))
                .Select(item => new ExerciseCatalogEntry
                {
                    Id = item.Id!.Trim(),
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
                _logger.LogWarning("Exercise catalog API returned entries without IDs or names. Returning {Count} cached entries.", cached.Count);
                return cached;
            }

            var collection = _dbContext.ExerciseCatalog;
            collection.DeleteAll();
            collection.Insert(mapped);

            _logger.LogInformation("Stored {Count} exercise catalog entries in cache", mapped.Count);
            return mapped;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh exercise catalog. Returning {Count} cached entries.", cached.Count);
            return cached;
        }
    }

    private IReadOnlyList<ExerciseCatalogEntry> GetCachedEntries()
        => _dbContext.ExerciseCatalog.FindAll().ToList();

    private static bool IsCacheFresh(IReadOnlyList<ExerciseCatalogEntry> cached)
    {
        if (cached.Count == 0)
        {
            return false;
        }

        var newest = cached.Max(entry => entry.CachedAt);
        return newest >= DateTime.UtcNow.Subtract(CacheDuration);
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
