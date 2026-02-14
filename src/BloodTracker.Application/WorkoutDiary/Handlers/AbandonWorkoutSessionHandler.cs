using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class AbandonWorkoutSessionHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<AbandonWorkoutSessionCommand>
{
    public async Task Handle(AbandonWorkoutSessionCommand request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct)
            ?? throw new KeyNotFoundException("Сессия не найдена");

        if (session.UserId != request.UserId)
            throw new KeyNotFoundException("Сессия не найдена");

        session.Status = WorkoutSessionStatus.Abandoned;
        session.CompletedAt = DateTime.UtcNow;

        await sessionRepository.UpdateAsync(session, ct);
    }
}
