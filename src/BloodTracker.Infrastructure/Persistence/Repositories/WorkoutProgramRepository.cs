using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class WorkoutProgramRepository : BaseRepository<WorkoutProgram>, IWorkoutProgramRepository
{
    public WorkoutProgramRepository(BloodTrackerDbContext context) : base(context.WorkoutPrograms)
    {
    }

    public Task<List<WorkoutProgram>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult(Collection.FindAll().ToList());

    public override Task<WorkoutProgram> UpdateAsync(WorkoutProgram program, CancellationToken ct = default)
    {
        program.UpdatedAt = DateTime.UtcNow;
        Collection.Update(program);
        return Task.FromResult(program);
    }
}
