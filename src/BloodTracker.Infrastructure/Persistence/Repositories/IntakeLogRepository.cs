using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class IntakeLogRepository : BaseRepository<IntakeLog>, IIntakeLogRepository
{
    public IntakeLogRepository(BloodTrackerDbContext context) : base(context.IntakeLogs)
    {
    }

    public Task<List<IntakeLog>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(Collection.Query().OrderByDescending(x => x.Date).ToList());

    public Task<List<IntakeLog>> GetRecentAsync(int count, CancellationToken ct = default)
        => Task.FromResult(Collection.Query().OrderByDescending(x => x.Date).Limit(count).ToList());

    public Task<List<IntakeLog>> GetByDrugIdAsync(Guid drugId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.DrugId == drugId).OrderByDescending(x => x.Date).ToList());

    public Task<bool> DeleteByDrugIdAsync(Guid drugId, CancellationToken ct = default)
        => Task.FromResult(Collection.DeleteMany(x => x.DrugId == drugId) > 0);

    public override Task<IntakeLog> UpdateAsync(IntakeLog log, CancellationToken ct = default)
    {
        log.UpdatedAt = DateTime.UtcNow;
        Collection.Update(log);
        return Task.FromResult(log);
    }
}
