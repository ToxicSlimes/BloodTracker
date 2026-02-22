using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class AddSetHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<AddSetCommand, WorkoutSessionSetDto>
{
    public async Task<WorkoutSessionSetDto> Handle(AddSetCommand request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct)
            ?? throw new KeyNotFoundException("Сессия не найдена");

        if (session.UserId != request.UserId)
            throw new KeyNotFoundException("Сессия не найдена");

        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");

        var exercise = session.Exercises.FirstOrDefault(e => e.Id == request.ExerciseId)
            ?? throw new KeyNotFoundException("Упражнение не найдено");

        var lastSet = exercise.Sets.OrderByDescending(s => s.OrderIndex).FirstOrDefault();

        var newSet = new WorkoutSessionSet
        {
            ExerciseId = exercise.Id,
            OrderIndex = (lastSet?.OrderIndex ?? -1) + 1,
            PlannedWeight = request.Weight ?? lastSet?.ActualWeight ?? lastSet?.PlannedWeight,
            PlannedRepetitions = request.Repetitions ?? lastSet?.ActualRepetitions ?? lastSet?.PlannedRepetitions,
            PlannedDurationSeconds = request.DurationSeconds ?? lastSet?.PlannedDurationSeconds
        };

        exercise.Sets.Add(newSet);
        await sessionRepository.UpdateAsync(session, ct);

        return new WorkoutSessionSetDto
        {
            Id = newSet.Id,
            OrderIndex = newSet.OrderIndex,
            PlannedWeight = newSet.PlannedWeight,
            PlannedRepetitions = newSet.PlannedRepetitions,
            PlannedDurationSeconds = newSet.PlannedDurationSeconds,
            Type = newSet.Type.ToString(),
            Tonnage = newSet.Tonnage,
            Comparison = newSet.CompareWithPrevious().ToString()
        };
    }
}
