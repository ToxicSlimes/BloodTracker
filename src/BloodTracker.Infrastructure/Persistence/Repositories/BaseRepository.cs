using LiteDB;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public abstract class BaseRepository<T> where T : class
{
    protected readonly ILiteCollection<T> Collection;

    protected BaseRepository(ILiteCollection<T> collection)
    {
        Collection = collection;
    }

    public virtual Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<T?>(Collection.FindById(id));

    public virtual Task<T> CreateAsync(T entity, CancellationToken ct = default)
    {
        Collection.Insert(entity);
        return Task.FromResult(entity);
    }

    public virtual Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        Collection.Update(entity);
        return Task.FromResult(entity);
    }

    public virtual Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(Collection.Delete(id));
}
