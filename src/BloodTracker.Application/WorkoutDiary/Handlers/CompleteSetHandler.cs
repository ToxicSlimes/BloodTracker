using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class CompleteSetHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<CompleteSetCommand, WorkoutSessionSetDto>
{
    public async Task<WorkoutSessionSetDto> Handle(CompleteSetCommand request, CancellationToken ct)
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
            var restSeconds = (int)(now - previousSet.CompletedAt.Value).TotalSeconds;
            previousSet.RestAfterSeconds = restSeconds;
        }

        if (!exercise.StartedAt.HasValue)
            exercise.StartedAt = now;

        if (exercise.IsCompleted)
            exercise.CompletedAt = now;

        await sessionRepository.UpdateAsync(session, ct);

        return new WorkoutSessionSetDto
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
    }
}
