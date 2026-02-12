using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class DrugRepository : BaseRepository<Drug>, IDrugRepository
{
    public DrugRepository(BloodTrackerDbContext context) : base(context.Drugs)
    {
    }

    public Task<List<Drug>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(Collection.FindAll().ToList());

    public Task<List<Drug>> GetByCourseIdAsync(Guid courseId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.CourseId == courseId).ToList());

    public override Task<Drug> UpdateAsync(Drug drug, CancellationToken ct = default)
    {
        drug.UpdatedAt = DateTime.UtcNow;
        Collection.Update(drug);
        return Task.FromResult(drug);
    }
}
