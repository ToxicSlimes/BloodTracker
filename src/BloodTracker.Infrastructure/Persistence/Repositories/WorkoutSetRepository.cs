using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class WorkoutSetRepository : BaseRepository<WorkoutSet>, IWorkoutSetRepository
{
    public WorkoutSetRepository(BloodTrackerDbContext context) : base(context.WorkoutSets)
    {
    }

    public Task<List<WorkoutSet>> GetByExerciseIdAsync(Guid exerciseId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.ExerciseId == exerciseId).ToList());

    public override Task<WorkoutSet> UpdateAsync(WorkoutSet set, CancellationToken ct = default)
    {
        set.UpdatedAt = DateTime.UtcNow;
        Collection.Update(set);
        return Task.FromResult(set);
    }
}
