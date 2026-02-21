using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class CompleteSetHandler(
    IWorkoutSessionRepository sessionRepository,
    IWorkoutStatsRepository statsRepository)
    : IRequestHandler<CompleteSetCommand, CompleteSetResultDto>
{
    public async Task<CompleteSetResultDto> Handle(CompleteSetCommand request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct)
            ?? throw new KeyNotFoundException("Сессия не найдена");

        if (session.UserId != request.UserId)
            throw new KeyNotFoundException("Сессия не найдена");

        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");

        var exercise = session.Exercises.FirstOrDefault(e => e.Sets.Any(s => s.Id == request.SetId))
            ?? throw new KeyNotFoundException("Подход не найден");

        var set = exercise.Sets.First(s => s.Id == request.SetId);
        var previousSet = exercise.Sets
            .Where(s => s.OrderIndex < set.OrderIndex && s.CompletedAt != null)
            .OrderByDescending(s => s.OrderIndex)
            .FirstOrDefault();

        var now = DateTime.UtcNow;
        set.CompletedAt = now;
        set.ActualWeight = request.Weight;
        set.ActualWeightKg = request.WeightKg ?? request.Weight;
        set.ActualRepetitions = request.Repetitions;
        set.ActualDurationSeconds = request.DurationSeconds;
        set.RPE = request.RPE;
        set.Type = request.Type;
        set.Notes = request.Notes;

        if (!set.StartedAt.HasValue)
            set.StartedAt = now;

        if (previousSet?.CompletedAt != null)
        {
            var restSeconds = (int)(now - previousSet.CompletedAt.Value.ToUniversalTime()).TotalSeconds;
            previousSet.RestAfterSeconds = restSeconds;
        }

        if (!exercise.StartedAt.HasValue)
            exercise.StartedAt = now;

        if (exercise.IsCompleted)
            exercise.CompletedAt = now;

        await sessionRepository.UpdateAsync(session, ct);

        var setDto = new WorkoutSessionSetDto
        {
            Id = set.Id,
            SourceSetId = set.SourceSetId,
            OrderIndex = set.OrderIndex,
            PlannedWeight = set.PlannedWeight,
            PlannedRepetitions = set.PlannedRepetitions,
            PlannedDurationSeconds = set.PlannedDurationSeconds,
            ActualWeight = set.ActualWeight,
            ActualWeightKg = set.ActualWeightKg,
            ActualRepetitions = set.ActualRepetitions,
            ActualDurationSeconds = set.ActualDurationSeconds,
            RPE = set.RPE,
            Type = set.Type.ToString(),
            Notes = set.Notes,
            PreviousWeight = set.PreviousWeight,
            PreviousReps = set.PreviousReps,
            CompletedAt = set.CompletedAt,
            RestAfterSeconds = set.RestAfterSeconds,
            Tonnage = set.Tonnage,
            Comparison = set.CompareWithPrevious().ToString()
        };

        var newPRs = new List<PRDetailDto>();

        if (set.Type != SetType.Warmup)
        {
            var pr = await statsRepository.GetExercisePRAsync(request.UserId, exercise.Name, ct);
            var isNewPR = false;

            if (pr == null)
            {
                pr = new UserExercisePR
                {
                    UserId = request.UserId,
                    ExerciseName = exercise.Name
                };
            }

            if (set.ActualWeightKg.HasValue && set.ActualWeightKg.Value > 0 && set.ActualWeightKg.Value > (pr.BestWeight ?? 0))
            {
                var previousValue = pr.BestWeight;
                var improvement = previousValue.HasValue && previousValue.Value > 0
                    ? Math.Round((set.ActualWeightKg.Value - previousValue.Value) / previousValue.Value * 100, 1)
                    : 0;

                newPRs.Add(new PRDetailDto
                {
                    RecordType = PersonalRecordType.MaxWeight.ToString(),
                    Value = set.ActualWeightKg.Value,
                    PreviousValue = previousValue,
                    ImprovementPercent = improvement,
                    ExerciseName = exercise.Name
                });

                await statsRepository.InsertPersonalRecordLogAsync(new PersonalRecordLog
                {
                    UserId = request.UserId,
                    ExerciseName = exercise.Name,
                    MuscleGroup = exercise.MuscleGroup,
                    RecordType = PersonalRecordType.MaxWeight,
                    Value = set.ActualWeightKg.Value,
                    PreviousValue = previousValue,
                    PreviousDate = pr.BestWeightDate,
                    ImprovementPercent = improvement,
                    SessionId = session.Id,
                    SetId = set.Id,
                    AchievedAt = now
                }, ct);

                pr.BestWeight = set.ActualWeightKg.Value;
                pr.BestWeightDate = now;
                isNewPR = true;
            }

            var estimated1RM = set.Estimated1RM;
            if (estimated1RM > 0 && estimated1RM > (pr.BestE1RM ?? 0))
            {
                var previousValue = pr.BestE1RM;
                var improvement = previousValue.HasValue && previousValue.Value > 0
                    ? Math.Round((estimated1RM - previousValue.Value) / previousValue.Value * 100, 1)
                    : 0;

                newPRs.Add(new PRDetailDto
                {
                    RecordType = PersonalRecordType.MaxEstimated1RM.ToString(),
                    Value = estimated1RM,
                    PreviousValue = previousValue,
                    ImprovementPercent = improvement,
                    ExerciseName = exercise.Name
                });

                await statsRepository.InsertPersonalRecordLogAsync(new PersonalRecordLog
                {
                    UserId = request.UserId,
                    ExerciseName = exercise.Name,
                    MuscleGroup = exercise.MuscleGroup,
                    RecordType = PersonalRecordType.MaxEstimated1RM,
                    Value = estimated1RM,
                    PreviousValue = previousValue,
                    PreviousDate = pr.BestE1RMDate,
                    ImprovementPercent = improvement,
                    SessionId = session.Id,
                    SetId = set.Id,
                    AchievedAt = now
                }, ct);

                pr.BestE1RM = estimated1RM;
                pr.BestE1RMDate = now;
                isNewPR = true;
            }

            if (set.ActualWeightKg.HasValue && set.ActualRepetitions.HasValue)
            {
                var weightBracket = RoundToWeightBracket(set.ActualWeightKg.Value);
                var key = weightBracket.ToString("F1");
                var reps = set.ActualRepetitions.Value;

                if (!pr.RepPRsByWeight.TryGetValue(key, out var existing) || reps > existing.Reps)
                {
                    var previousReps = existing?.Reps;
                    var improvement = previousReps.HasValue && previousReps.Value > 0
                        ? Math.Round((decimal)(reps - previousReps.Value) / previousReps.Value * 100, 1)
                        : 0;

                    newPRs.Add(new PRDetailDto
                    {
                        RecordType = PersonalRecordType.MaxRepAtWeight.ToString(),
                        Value = reps,
                        PreviousValue = previousReps,
                        ImprovementPercent = improvement,
                        ExerciseName = exercise.Name
                    });

                    await statsRepository.InsertPersonalRecordLogAsync(new PersonalRecordLog
                    {
                        UserId = request.UserId,
                        ExerciseName = exercise.Name,
                        MuscleGroup = exercise.MuscleGroup,
                        RecordType = PersonalRecordType.MaxRepAtWeight,
                        Value = reps,
                        PreviousValue = previousReps,
                        PreviousDate = existing?.Date,
                        ImprovementPercent = improvement,
                        SessionId = session.Id,
                        SetId = set.Id,
                        AchievedAt = now
                    }, ct);

                    pr.RepPRsByWeight[key] = new RepPREntry { Reps = reps, Date = now };
                    isNewPR = true;
                }
            }

            if (isNewPR)
                await statsRepository.UpsertExercisePRAsync(pr, ct);
        }

        return new CompleteSetResultDto
        {
            Set = setDto,
            IsNewPR = newPRs.Count > 0,
            NewPRs = newPRs
        };
    }

    private static decimal RoundToWeightBracket(decimal weight) =>
        Math.Round(weight / 2.5m) * 2.5m;
}
