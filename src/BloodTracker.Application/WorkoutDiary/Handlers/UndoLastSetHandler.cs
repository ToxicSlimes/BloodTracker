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

        return SessionMapper.ToDto(session);
    }
}
