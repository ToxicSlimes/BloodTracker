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

    public Task InsertPersonalRecordLogAsync(PersonalRecordLog log, CancellationToken ct = default)
    {
        context.PersonalRecordLogs.Insert(log);
        return Task.CompletedTask;
    }

    public Task<List<PersonalRecordLog>> GetPersonalRecordLogsAsync(string userId, string? exerciseName, int skip, int take, CancellationToken ct = default)
    {
        var query = context.PersonalRecordLogs.Query()
            .Where(l => l.UserId == userId);

        if (!string.IsNullOrEmpty(exerciseName))
            query = query.Where(l => l.ExerciseName == exerciseName);

        var result = query
            .OrderByDescending(l => l.AchievedAt)
            .Skip(skip)
            .Limit(take)
            .ToList();

        return Task.FromResult(result);
    }

    public Task<int> GetPersonalRecordLogCountAsync(string userId, string? exerciseName, CancellationToken ct = default)
    {
        var query = context.PersonalRecordLogs.Query()
            .Where(l => l.UserId == userId);

        if (!string.IsNullOrEmpty(exerciseName))
            query = query.Where(l => l.ExerciseName == exerciseName);

        return Task.FromResult(query.Count());
    }

    public Task<List<DailyExerciseStats>> GetExerciseProgressAsync(string userId, string exerciseName, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var query = context.DailyExerciseStats.Query()
            .Where(s => s.UserId == userId && s.ExerciseName == exerciseName);

        if (from.HasValue)
            query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.Date <= to.Value);

        return Task.FromResult(query.OrderBy(s => s.Date).ToList());
    }

    public Task<List<DailyExerciseStats>> GetMuscleGroupProgressAsync(string userId, MuscleGroup muscleGroup, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var query = context.DailyExerciseStats.Query()
            .Where(s => s.UserId == userId && s.MuscleGroup == muscleGroup);

        if (from.HasValue)
            query = query.Where(s => s.Date >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.Date <= to.Value);

        return Task.FromResult(query.OrderBy(s => s.Date).ToList());
    }

    public Task<List<WeeklyUserStats>> GetWeeklyStatsRangeAsync(string userId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var allStats = context.WeeklyUserStats.Query()
            .Where(s => s.UserId == userId)
            .ToList();

        if (from.HasValue || to.HasValue)
        {
            allStats = allStats.Where(s =>
            {
                var weekStart = System.Globalization.ISOWeek.ToDateTime(s.Year, s.WeekNumber, DayOfWeek.Monday);
                if (from.HasValue && weekStart < from.Value) return false;
                if (to.HasValue && weekStart > to.Value) return false;
                return true;
            }).ToList();
        }

        return Task.FromResult(allStats.OrderBy(s => s.Year).ThenBy(s => s.WeekNumber).ToList());
    }

    public Task<List<WeeklyMuscleVolume>> GetWeeklyMuscleVolumeRangeAsync(string userId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var allVolume = context.WeeklyMuscleVolume.Query()
            .Where(s => s.UserId == userId)
            .ToList();

        if (from.HasValue || to.HasValue)
        {
            allVolume = allVolume.Where(s =>
            {
                var weekStart = System.Globalization.ISOWeek.ToDateTime(s.Year, s.WeekNumber, DayOfWeek.Monday);
                if (from.HasValue && weekStart < from.Value) return false;
                if (to.HasValue && weekStart > to.Value) return false;
                return true;
            }).ToList();
        }

        return Task.FromResult(allVolume.OrderBy(s => s.Year).ThenBy(s => s.WeekNumber).ToList());
    }

    public Task<List<UserExercisePR>> GetAllExercisePRsAsync(string userId, CancellationToken ct = default)
        => Task.FromResult(context.UserExercisePRs.Query()
            .Where(p => p.UserId == userId)
            .ToList());

    public Task<List<DateTime>> GetWorkoutDatesAsync(string userId, DateTime from, DateTime to, CancellationToken ct = default)
    {
        var dates = context.WorkoutSessions.Query()
            .Where(s => s.UserId == userId && s.Status == WorkoutSessionStatus.Completed && s.StartedAt >= from && s.StartedAt <= to)
            .ToList()
            .Select(s => s.StartedAt.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        return Task.FromResult(dates);
    }
}
