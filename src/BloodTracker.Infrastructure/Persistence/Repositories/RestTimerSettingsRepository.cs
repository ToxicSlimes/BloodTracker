using BloodTracker.Application.Common;
using BloodTracker.Domain.Models.WorkoutDiary;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class RestTimerSettingsRepository(BloodTrackerDbContext context) : IRestTimerSettingsRepository
{
    private LiteDB.ILiteCollection<RestTimerSettings> Collection => context.RestTimerSettings;

    public Task<RestTimerSettings?> GetByUserIdAsync(string userId, CancellationToken ct = default)
        => Task.FromResult(Collection.Query().Where(s => s.UserId == userId).FirstOrDefault());

    public Task<RestTimerSettings> GetOrCreateAsync(string userId, CancellationToken ct = default)
    {
        var existing = Collection.Query().Where(s => s.UserId == userId).FirstOrDefault();
        if (existing != null)
            return Task.FromResult(existing);
        var created = new RestTimerSettings { UserId = userId };
        Collection.Insert(created);
        return Task.FromResult(created);
    }

    public Task<RestTimerSettings> UpdateAsync(RestTimerSettings settings, CancellationToken ct = default)
    {
        settings.UpdatedAt = DateTime.UtcNow;
        Collection.Update(settings);
        return Task.FromResult(settings);
    }
}
