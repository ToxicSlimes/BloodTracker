using BloodTracker.Application.Common;
using BloodTracker.Domain.Models.WorkoutDiary;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class WorkoutSessionRepository(BloodTrackerDbContext context) : IWorkoutSessionRepository
{
    private LiteDB.ILiteCollection<WorkoutSession> Collection => context.WorkoutSessions;

    public Task<WorkoutSession?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult<WorkoutSession?>(Collection.FindById(id));

    public Task<WorkoutSession?> GetActiveAsync(string userId, CancellationToken ct = default)
        => Task.FromResult<WorkoutSession?>(Collection.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.InProgress)
            .FirstOrDefault());

    public Task<List<WorkoutSession>> GetHistoryAsync(string userId, DateTime? from, DateTime? to, int skip, int take, CancellationToken ct = default)
    {
        var query = Collection.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed);

        if (from.HasValue)
            query = query.Where(s => s.StartedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.StartedAt <= to.Value);

        var result = query
            .OrderByDescending(s => s.StartedAt)
            .Skip(skip)
            .Limit(take)
            .ToList();

        return Task.FromResult(result);
    }

    public Task<int> GetHistoryCountAsync(string userId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var query = Collection.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed);

        if (from.HasValue)
            query = query.Where(s => s.StartedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.StartedAt <= to.Value);

        return Task.FromResult(query.Count());
    }

    public Task<WorkoutSession?> GetLastCompletedAsync(string userId, CancellationToken ct = default)
        => Task.FromResult<WorkoutSession?>(Collection.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed)
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefault());

    public Task<WorkoutSession?> GetLastWithExerciseAsync(string userId, string exerciseName, CancellationToken ct = default)
    {
        var sessions = Collection.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed)
            .OrderByDescending(s => s.StartedAt)
            .ToList();

        var session = sessions.FirstOrDefault(s => s.Exercises.Any(e => e.Name == exerciseName));
        return Task.FromResult<WorkoutSession?>(session);
    }

    public Task<WorkoutSession> CreateAsync(WorkoutSession session, CancellationToken ct = default)
    {
        Collection.Insert(session);
        return Task.FromResult(session);
    }

    public Task<WorkoutSession> UpdateAsync(WorkoutSession session, CancellationToken ct = default)
    {
        session.UpdatedAt = DateTime.UtcNow;
        Collection.Update(session);
        return Task.FromResult(session);
    }
}
