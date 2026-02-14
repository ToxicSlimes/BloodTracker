using System.Globalization;
using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class CompleteWorkoutSessionHandler(
    IWorkoutSessionRepository sessionRepository,
    IWorkoutStatsRepository statsRepository)
    : IRequestHandler<CompleteWorkoutSessionCommand, WorkoutSessionSummaryDto>
{
    public async Task<WorkoutSessionSummaryDto> Handle(CompleteWorkoutSessionCommand request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct)
            ?? throw new KeyNotFoundException("Сессия не найдена");

        if (session.UserId != request.UserId)
            throw new KeyNotFoundException("Сессия не найдена");

        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");

        var now = DateTime.UtcNow;
        session.CompletedAt = now;
        session.Status = WorkoutSessionStatus.Completed;
        session.DurationSeconds = (int)(now - session.StartedAt).TotalSeconds;

        if (!string.IsNullOrEmpty(request.Notes))
            session.Notes = string.IsNullOrEmpty(session.Notes) ? request.Notes : $"{session.Notes}\n{request.Notes}";

        var allSets = session.Exercises
            .SelectMany(e => e.Sets)
            .Where(s => s.CompletedAt != null)
            .ToList();

        session.TotalSetsCompleted = allSets.Count;
        session.TotalTonnage = allSets.Sum(s => s.Tonnage);
        session.TotalVolume = allSets.Sum(s => s.ActualRepetitions ?? 0);

        var weightedSets = allSets.Where(s => s.ActualWeightKg.HasValue && s.ActualRepetitions.HasValue).ToList();
        var totalWeightedReps = weightedSets.Sum(s => s.ActualWeightKg!.Value * s.ActualRepetitions!.Value);
        session.AverageIntensity = session.TotalVolume > 0 ? totalWeightedReps / session.TotalVolume : 0;

        var restTimes = session.Exercises
            .SelectMany(e => e.Sets)
            .Where(s => s.RestAfterSeconds.HasValue)
            .Select(s => s.RestAfterSeconds!.Value)
            .ToList();
        session.AverageRestSeconds = restTimes.Count > 0 ? (int)restTimes.Average() : 0;

        await sessionRepository.UpdateAsync(session, ct);

        var sessionDate = session.StartedAt.Date;
        var (year, week) = GetIsoYearWeek(sessionDate);

        foreach (var exercise in session.Exercises)
        {
            var completedSets = exercise.Sets.Where(s => s.CompletedAt != null).ToList();
            if (completedSets.Count == 0) continue;

            await UpdateDailyExerciseStats(request.UserId, sessionDate, exercise, completedSets, ct);
            await UpdateExercisePR(request.UserId, sessionDate, exercise, completedSets, ct);
        }

        await RecalculateWeeklyUserStats(request.UserId, year, week, ct);
        await RecalculateWeeklyMuscleVolume(request.UserId, year, week, ct);

        return new WorkoutSessionSummaryDto { Session = SessionMapper.ToDto(session) };
    }

    private async Task UpdateDailyExerciseStats(
        string userId, DateTime date, WorkoutSessionExercise exercise,
        List<WorkoutSessionSet> completedSets, CancellationToken ct)
    {
        var existingStats = await statsRepository.GetDailyExerciseStatsAsync(userId, date, exercise.Name, ct);

        var stats = existingStats ?? new DailyExerciseStats
        {
            UserId = userId,
            Date = date,
            ExerciseName = exercise.Name,
            MuscleGroup = exercise.MuscleGroup
        };

        stats.TotalSets = completedSets.Count;
        stats.TotalReps = completedSets.Sum(s => s.ActualRepetitions ?? 0);
        stats.TotalTonnage = completedSets.Sum(s => s.Tonnage);
        stats.MaxWeight = completedSets.Where(s => s.ActualWeightKg.HasValue).Select(s => s.ActualWeightKg!.Value).DefaultIfEmpty(0).Max();
        stats.BestEstimated1RM = completedSets.Select(s => s.Estimated1RM).DefaultIfEmpty(0).Max();
        stats.AverageRPE = completedSets.Where(s => s.RPE.HasValue).Any()
            ? (int)completedSets.Where(s => s.RPE.HasValue).Average(s => s.RPE!.Value) : 0;

        await statsRepository.UpsertDailyExerciseStatsAsync(stats, ct);
    }

    private async Task UpdateExercisePR(
        string userId, DateTime date, WorkoutSessionExercise exercise,
        List<WorkoutSessionSet> completedSets, CancellationToken ct)
    {
        var sessionVolume = completedSets.Sum(s => s.Tonnage);
        if (sessionVolume <= 0) return;

        var pr = await statsRepository.GetExercisePRAsync(userId, exercise.Name, ct);

        if (pr == null)
        {
            pr = new UserExercisePR
            {
                UserId = userId,
                ExerciseName = exercise.Name,
                BestVolumeSingleSession = sessionVolume,
                BestVolumeDate = date
            };
            await statsRepository.UpsertExercisePRAsync(pr, ct);
            await statsRepository.InsertPersonalRecordLogAsync(new PersonalRecordLog
            {
                UserId = userId,
                ExerciseName = exercise.Name,
                MuscleGroup = exercise.MuscleGroup,
                RecordType = PersonalRecordType.MaxVolumeSingleSession,
                Value = sessionVolume,
                SessionId = exercise.Sets.FirstOrDefault()?.ExerciseId ?? Guid.Empty,
                SetId = Guid.Empty,
                AchievedAt = DateTime.UtcNow
            }, ct);
            return;
        }

        if (sessionVolume > (pr.BestVolumeSingleSession ?? 0))
        {
            var previousValue = pr.BestVolumeSingleSession;
            var improvement = previousValue.HasValue && previousValue.Value > 0
                ? Math.Round((sessionVolume - previousValue.Value) / previousValue.Value * 100, 1)
                : 0;

            pr.BestVolumeSingleSession = sessionVolume;
            pr.BestVolumeDate = date;
            await statsRepository.UpsertExercisePRAsync(pr, ct);

            await statsRepository.InsertPersonalRecordLogAsync(new PersonalRecordLog
            {
                UserId = userId,
                ExerciseName = exercise.Name,
                MuscleGroup = exercise.MuscleGroup,
                RecordType = PersonalRecordType.MaxVolumeSingleSession,
                Value = sessionVolume,
                PreviousValue = previousValue,
                PreviousDate = pr.BestVolumeDate,
                ImprovementPercent = improvement,
                SessionId = exercise.Sets.FirstOrDefault()?.ExerciseId ?? Guid.Empty,
                SetId = Guid.Empty,
                AchievedAt = DateTime.UtcNow
            }, ct);
        }
    }

    private async Task RecalculateWeeklyUserStats(string userId, int year, int week, CancellationToken ct)
    {
        var (weekStart, weekEnd) = GetWeekDateRange(year, week);
        var sessions = await sessionRepository.GetHistoryAsync(userId, weekStart, weekEnd, 0, 1000, ct);

        var stats = await statsRepository.GetWeeklyUserStatsAsync(userId, year, week, ct)
            ?? new WeeklyUserStats { UserId = userId, Year = year, WeekNumber = week };

        stats.TotalSessions = sessions.Count;
        stats.TotalSets = sessions.Sum(s => s.TotalSetsCompleted);
        stats.TotalReps = sessions.Sum(s => s.TotalVolume);
        stats.TotalTonnage = sessions.Sum(s => s.TotalTonnage);
        stats.TotalDurationSeconds = sessions.Sum(s => s.DurationSeconds);

        var restValues = sessions.Where(s => s.AverageRestSeconds > 0).Select(s => s.AverageRestSeconds).ToList();
        stats.AverageRestSeconds = restValues.Count > 0 ? (int)restValues.Average() : 0;

        await statsRepository.UpsertWeeklyUserStatsAsync(stats, ct);
    }

    private async Task RecalculateWeeklyMuscleVolume(string userId, int year, int week, CancellationToken ct)
    {
        var (weekStart, weekEnd) = GetWeekDateRange(year, week);
        var sessions = await sessionRepository.GetHistoryAsync(userId, weekStart, weekEnd, 0, 1000, ct);

        var muscleData = new Dictionary<MuscleGroup, (int sets, int reps, decimal tonnage)>();

        foreach (var session in sessions)
        {
            foreach (var exercise in session.Exercises)
            {
                var completedSets = exercise.Sets.Where(s => s.CompletedAt != null).ToList();
                if (completedSets.Count == 0) continue;

                var mg = exercise.MuscleGroup;
                var current = muscleData.GetValueOrDefault(mg);
                muscleData[mg] = (
                    current.sets + completedSets.Count,
                    current.reps + completedSets.Sum(s => s.ActualRepetitions ?? 0),
                    current.tonnage + completedSets.Sum(s => s.Tonnage)
                );
            }
        }

        foreach (var (muscleGroup, data) in muscleData)
        {
            var existing = await statsRepository.GetWeeklyMuscleVolumeAsync(userId, year, week, muscleGroup, ct)
                ?? new WeeklyMuscleVolume { UserId = userId, Year = year, WeekNumber = week, MuscleGroup = muscleGroup };

            existing.TotalSets = data.sets;
            existing.TotalReps = data.reps;
            existing.TotalTonnage = data.tonnage;

            await statsRepository.UpsertWeeklyMuscleVolumeAsync(existing, ct);
        }
    }

    private static (int Year, int Week) GetIsoYearWeek(DateTime date) =>
        (ISOWeek.GetYear(date), ISOWeek.GetWeekOfYear(date));

    private static (DateTime Start, DateTime End) GetWeekDateRange(int year, int week)
    {
        var start = ISOWeek.ToDateTime(year, week, DayOfWeek.Monday);
        var end = start.AddDays(7).AddTicks(-1);
        return (start, end);
    }
}
