using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class UndoLastSetHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<UndoLastSetCommand, WorkoutSessionDto>
{
    public async Task<WorkoutSessionDto> Handle(UndoLastSetCommand request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct)
            ?? throw new KeyNotFoundException("Сессия не найдена");

        if (session.UserId != request.UserId)
            throw new KeyNotFoundException("Сессия не найдена");

        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");

        var lastCompletedSet = session.Exercises
            .SelectMany(e => e.Sets)
            .Where(s => s.CompletedAt != null)
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefault();

        if (lastCompletedSet == null)
            throw new InvalidOperationException("Нет завершённых подходов для отмены");

        lastCompletedSet.ActualWeight = null;
        lastCompletedSet.ActualWeightKg = null;
        lastCompletedSet.ActualRepetitions = null;
        lastCompletedSet.ActualDurationSeconds = null;
        lastCompletedSet.RPE = null;
        lastCompletedSet.CompletedAt = null;
        lastCompletedSet.StartedAt = null;
        lastCompletedSet.Notes = null;

        var exercise = session.Exercises.First(e => e.Sets.Any(s => s.Id == lastCompletedSet.Id));
        exercise.CompletedAt = null;

        await sessionRepository.UpdateAsync(session, ct);

        return MapToDto(session);
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
