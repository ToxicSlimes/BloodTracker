using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class AnalysisRepository : BaseRepository<Analysis>, IAnalysisRepository
{
    public AnalysisRepository(BloodTrackerDbContext context) : base(context.Analyses)
    {
    }

    public Task<List<Analysis>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(Collection.Query().OrderByDescending(x => x.Date).ToList());
}
