using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class PurchaseRepository : BaseRepository<Purchase>, IPurchaseRepository
{
    public PurchaseRepository(BloodTrackerDbContext context) : base(context.Purchases)
    {
    }

    public Task<List<Purchase>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(Collection.Query().OrderByDescending(x => x.PurchaseDate).ToList());

    public Task<List<Purchase>> GetByDrugIdAsync(Guid drugId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.DrugId == drugId).OrderByDescending(x => x.PurchaseDate).ToList());

    public override Task<Purchase> UpdateAsync(Purchase purchase, CancellationToken ct = default)
    {
        purchase.UpdatedAt = DateTime.UtcNow;
        Collection.Update(purchase);
        return Task.FromResult(purchase);
    }
}
