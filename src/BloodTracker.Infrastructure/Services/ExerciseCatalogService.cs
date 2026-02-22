using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class ExerciseCatalogService(
    CatalogDbContext db,
    IMemoryCache cache,
    ILogger<ExerciseCatalogService> logger) : IExerciseCatalogService
{
    private const string CacheKey = "ExerciseCatalog_All";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    public Task<IReadOnlyList<ExerciseCatalogEntry>> GetCatalogAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue<List<ExerciseCatalogEntry>>(CacheKey, out var cached) && cached is not null)
        {
            return Task.FromResult<IReadOnlyList<ExerciseCatalogEntry>>(cached);
        }

        var entries = db.ExerciseCatalog.FindAll().ToList();

        cache.Set(CacheKey, entries, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CacheDuration
        });

        logger.LogInformation("Loaded {Count} exercises from catalog database", entries.Count);

        return Task.FromResult<IReadOnlyList<ExerciseCatalogEntry>>(entries);
    }
}
