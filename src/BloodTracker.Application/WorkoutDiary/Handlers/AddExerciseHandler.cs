using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class AddExerciseHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<AddExerciseCommand, WorkoutSessionExerciseDto>
{
    public async Task<WorkoutSessionExerciseDto> Handle(AddExerciseCommand request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct)
            ?? throw new KeyNotFoundException("Сессия не найдена");

        if (session.UserId != request.UserId)
            throw new KeyNotFoundException("Сессия не найдена");

        if (session.Status != WorkoutSessionStatus.InProgress)
            throw new InvalidOperationException("Тренировка уже завершена");

        var maxOrder = session.Exercises.Any() ? session.Exercises.Max(e => e.OrderIndex) : -1;

        var exercise = new WorkoutSessionExercise
        {
            SessionId = session.Id,
            Name = request.Name,
            MuscleGroup = request.MuscleGroup,
            Notes = request.Notes,
            OrderIndex = maxOrder + 1
        };

        session.Exercises.Add(exercise);
        await sessionRepository.UpdateAsync(session, ct);

        return new WorkoutSessionExerciseDto
        {
            Id = exercise.Id,
            Name = exercise.Name,
            MuscleGroup = exercise.MuscleGroup.ToString(),
            Notes = exercise.Notes,
            OrderIndex = exercise.OrderIndex,
            IsCompleted = exercise.IsCompleted,
            Sets = new()
        };
    }
}
