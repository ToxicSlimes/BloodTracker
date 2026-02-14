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

            var existingStats = await statsRepository.GetDailyExerciseStatsAsync(
                request.UserId, sessionDate, exercise.Name, ct);

            var stats = existingStats ?? new DailyExerciseStats
            {
                UserId = request.UserId,
                Date = sessionDate,
                ExerciseName = exercise.Name,
                MuscleGroup = exercise.MuscleGroup
            };

            stats.TotalSets = completedSets.Count;
            stats.TotalReps = completedSets.Sum(s => s.ActualRepetitions ?? 0);
            stats.TotalTonnage = completedSets.Sum(s => s.Tonnage);
            stats.MaxWeight = completedSets.Where(s => s.ActualWeightKg.HasValue).Select(s => s.ActualWeightKg!.Value).DefaultIfEmpty(0).Max();
            stats.BestEstimated1RM = completedSets.Select(s => s.Estimated1RM).DefaultIfEmpty(0).Max();
            stats.AverageRPE = completedSets.Where(s => s.RPE.HasValue).Select(s => s.RPE!.Value).DefaultIfEmpty(0).Any()
                ? (int)completedSets.Where(s => s.RPE.HasValue).Average(s => s.RPE!.Value) : 0;

            await statsRepository.UpsertDailyExerciseStatsAsync(stats, ct);

            var pr = await statsRepository.GetExercisePRAsync(request.UserId, exercise.Name, ct);
            var maxWeight = stats.MaxWeight;
            var best1RM = stats.BestEstimated1RM;

            if (pr == null)
            {
                pr = new UserExercisePR
                {
                    UserId = request.UserId,
                    ExerciseName = exercise.Name,
                    MaxWeightKg = maxWeight,
                    MaxWeightDate = sessionDate,
                    BestEstimated1RM = best1RM,
                    Best1RMDate = sessionDate
                };
                await statsRepository.UpsertExercisePRAsync(pr, ct);
            }
            else
            {
                var updated = false;
                if (maxWeight > pr.MaxWeightKg)
                {
                    pr.MaxWeightKg = maxWeight;
                    pr.MaxWeightDate = sessionDate;
                    updated = true;
                }
                if (best1RM > pr.BestEstimated1RM)
                {
                    pr.BestEstimated1RM = best1RM;
                    pr.Best1RMDate = sessionDate;
                    updated = true;
                }

                foreach (var s in completedSets.Where(s => s.ActualWeightKg.HasValue && s.ActualRepetitions.HasValue))
                {
                    var reps = s.ActualRepetitions!.Value;
                    var weight = s.ActualWeightKg!.Value;
                    var existing = pr.RepBrackets.FirstOrDefault(b => b.Reps == reps);
                    if (existing == null)
                    {
                        pr.RepBrackets.Add(new RepBracketPR { Reps = reps, WeightKg = weight, AchievedAt = sessionDate });
                        updated = true;
                    }
                    else if (weight > existing.WeightKg)
                    {
                        existing.WeightKg = weight;
                        existing.AchievedAt = sessionDate;
                        updated = true;
                    }
                }

                if (updated)
                    await statsRepository.UpsertExercisePRAsync(pr, ct);
            }

            var existingMuscle = await statsRepository.GetWeeklyMuscleVolumeAsync(
                request.UserId, year, week, exercise.MuscleGroup, ct);

            var muscleVolume = existingMuscle ?? new WeeklyMuscleVolume
            {
                UserId = request.UserId,
                Year = year,
                WeekNumber = week,
                MuscleGroup = exercise.MuscleGroup
            };

            muscleVolume.TotalSets += completedSets.Count;
            muscleVolume.TotalReps += completedSets.Sum(s => s.ActualRepetitions ?? 0);
            muscleVolume.TotalTonnage += completedSets.Sum(s => s.Tonnage);

            await statsRepository.UpsertWeeklyMuscleVolumeAsync(muscleVolume, ct);
        }

        var existingWeekly = await statsRepository.GetWeeklyUserStatsAsync(request.UserId, year, week, ct);
        var weeklyStats = existingWeekly ?? new WeeklyUserStats
        {
            UserId = request.UserId,
            Year = year,
            WeekNumber = week
        };

        weeklyStats.TotalSessions++;
        weeklyStats.TotalSets += session.TotalSetsCompleted;
        weeklyStats.TotalReps += session.TotalVolume;
        weeklyStats.TotalTonnage += session.TotalTonnage;
        weeklyStats.TotalDurationSeconds += session.DurationSeconds;
        weeklyStats.AverageRestSeconds = session.AverageRestSeconds;

        await statsRepository.UpsertWeeklyUserStatsAsync(weeklyStats, ct);

        return new WorkoutSessionSummaryDto { Session = MapToDto(session) };
    }

    private static (int Year, int Week) GetIsoYearWeek(DateTime date)
    {
        var week = ISOWeek.GetWeekOfYear(date);
        var year = ISOWeek.GetYear(date);
        return (year, week);
    }

    private static WorkoutSessionDto MapToDto(WorkoutSession session) => new()
    {
        Id = session.Id,
        UserId = session.UserId,
        SourceProgramId = session.SourceProgramId,
        SourceDayId = session.SourceDayId,
        Title = session.Title,
        Notes = session.Notes,
        StartedAt = session.StartedAt,
        CompletedAt = session.CompletedAt,
        DurationSeconds = session.DurationSeconds,
        Status = session.Status.ToString(),
        TotalTonnage = session.TotalTonnage,
        TotalVolume = session.TotalVolume,
        TotalSetsCompleted = session.TotalSetsCompleted,
        AverageIntensity = session.AverageIntensity,
        AverageRestSeconds = session.AverageRestSeconds,
        Exercises = session.Exercises.Select(e => new WorkoutSessionExerciseDto
        {
            Id = e.Id,
            SourceExerciseId = e.SourceExerciseId,
            Name = e.Name,
            MuscleGroup = e.MuscleGroup.ToString(),
            Notes = e.Notes,
            OrderIndex = e.OrderIndex,
            IsCompleted = e.IsCompleted,
            Sets = e.Sets.Select(s => new WorkoutSessionSetDto
            {
                Id = s.Id,
                SourceSetId = s.SourceSetId,
                OrderIndex = s.OrderIndex,
                PlannedWeight = s.PlannedWeight,
                PlannedRepetitions = s.PlannedRepetitions,
                PlannedDurationSeconds = s.PlannedDurationSeconds,
                ActualWeight = s.ActualWeight,
                ActualWeightKg = s.ActualWeightKg,
                ActualRepetitions = s.ActualRepetitions,
                ActualDurationSeconds = s.ActualDurationSeconds,
                RPE = s.RPE,
                Type = s.Type.ToString(),
                Notes = s.Notes,
                PreviousWeight = s.PreviousWeight,
                PreviousReps = s.PreviousReps,
                CompletedAt = s.CompletedAt,
                RestAfterSeconds = s.RestAfterSeconds,
                Tonnage = s.Tonnage,
                Comparison = s.CompareWithPrevious().ToString()
            }).ToList()
        }).ToList()
    };
}
