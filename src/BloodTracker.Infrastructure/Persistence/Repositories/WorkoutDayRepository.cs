using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class WorkoutDayRepository : BaseRepository<WorkoutDay>, IWorkoutDayRepository
{
    public WorkoutDayRepository(BloodTrackerDbContext context) : base(context.WorkoutDays)
    {
    }

    public Task<List<WorkoutDay>> GetByProgramIdAsync(Guid programId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.ProgramId == programId).ToList());

    public override Task<WorkoutDay> UpdateAsync(WorkoutDay day, CancellationToken ct = default)
    {
        day.UpdatedAt = DateTime.UtcNow;
        Collection.Update(day);
        return Task.FromResult(day);
    }
}
