using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class WorkoutExerciseRepository : BaseRepository<WorkoutExercise>, IWorkoutExerciseRepository
{
    public WorkoutExerciseRepository(BloodTrackerDbContext context) : base(context.WorkoutExercises)
    {
    }

    public Task<List<WorkoutExercise>> GetByProgramIdAsync(Guid programId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.ProgramId == programId).ToList());

    public Task<List<WorkoutExercise>> GetByDayIdAsync(Guid dayId, CancellationToken ct = default)
        => Task.FromResult(Collection.Find(x => x.DayId == dayId).ToList());

    public override Task<WorkoutExercise> UpdateAsync(WorkoutExercise exercise, CancellationToken ct = default)
    {
        exercise.UpdatedAt = DateTime.UtcNow;
        Collection.Update(exercise);
        return Task.FromResult(exercise);
    }
}
