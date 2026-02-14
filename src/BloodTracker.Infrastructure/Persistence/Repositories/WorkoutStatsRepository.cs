using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class WorkoutStatsRepository(BloodTrackerDbContext context) : IWorkoutStatsRepository
{
    public Task UpsertDailyExerciseStatsAsync(DailyExerciseStats stats, CancellationToken ct = default)
    {
        context.DailyExerciseStats.Upsert(stats);
        return Task.CompletedTask;
    }

    public Task UpsertWeeklyUserStatsAsync(WeeklyUserStats stats, CancellationToken ct = default)
    {
        context.WeeklyUserStats.Upsert(stats);
        return Task.CompletedTask;
    }

    public Task UpsertWeeklyMuscleVolumeAsync(WeeklyMuscleVolume stats, CancellationToken ct = default)
    {
        context.WeeklyMuscleVolume.Upsert(stats);
        return Task.CompletedTask;
    }

    public Task<UserExercisePR?> GetExercisePRAsync(string userId, string exerciseName, CancellationToken ct = default)
        => Task.FromResult<UserExercisePR?>(context.UserExercisePRs.Query()
            .Where(p => p.UserId == userId && p.ExerciseName == exerciseName)
            .FirstOrDefault());

    public Task UpsertExercisePRAsync(UserExercisePR pr, CancellationToken ct = default)
    {
        context.UserExercisePRs.Upsert(pr);
        return Task.CompletedTask;
    }

    public Task<WeeklyUserStats?> GetWeeklyUserStatsAsync(string userId, int year, int week, CancellationToken ct = default)
        => Task.FromResult<WeeklyUserStats?>(context.WeeklyUserStats.Query()
            .Where(s => s.UserId == userId && s.Year == year && s.WeekNumber == week)
            .FirstOrDefault());

    public Task<WeeklyMuscleVolume?> GetWeeklyMuscleVolumeAsync(string userId, int year, int week, MuscleGroup muscleGroup, CancellationToken ct = default)
        => Task.FromResult<WeeklyMuscleVolume?>(context.WeeklyMuscleVolume.Query()
            .Where(s => s.UserId == userId && s.Year == year && s.WeekNumber == week && s.MuscleGroup == muscleGroup)
            .FirstOrDefault());

    public Task<DailyExerciseStats?> GetDailyExerciseStatsAsync(string userId, DateTime date, string exerciseName, CancellationToken ct = default)
        => Task.FromResult<DailyExerciseStats?>(context.DailyExerciseStats.Query()
            .Where(s => s.UserId == userId && s.Date == date && s.ExerciseName == exerciseName)
            .FirstOrDefault());

    public Task<int> GetAverageRestSecondsAsync(string userId, CancellationToken ct = default)
    {
        var sessions = context.WorkoutSessions.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed && s.AverageRestSeconds > 0)
            .OrderByDescending(s => s.StartedAt)
            .Limit(10)
            .ToList();

        if (sessions.Count == 0) return Task.FromResult(0);
        return Task.FromResult((int)sessions.Average(s => s.AverageRestSeconds));
    }
}
