using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Commands;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class StartWorkoutSessionHandler(
    IWorkoutSessionRepository sessionRepository,
    IWorkoutDayRepository dayRepository,
    IWorkoutExerciseRepository exerciseRepository,
    IWorkoutSetRepository setRepository)
    : IRequestHandler<StartWorkoutSessionCommand, WorkoutSessionDto>
{
    public async Task<WorkoutSessionDto> Handle(StartWorkoutSessionCommand request, CancellationToken ct)
    {
        var active = await sessionRepository.GetActiveAsync(request.UserId, ct);
        if (active != null)
            throw new InvalidOperationException("У вас уже есть активная тренировка");

        var session = new WorkoutSession
        {
            UserId = request.UserId,
            StartedAt = DateTime.UtcNow,
            Status = WorkoutSessionStatus.InProgress,
            Title = request.CustomTitle ?? "Тренировка",
            Notes = request.Notes
        };

        if (request.RepeatLast)
        {
            var lastSession = await sessionRepository.GetLastCompletedAsync(request.UserId, ct);
            if (lastSession != null)
            {
                session.Title = lastSession.Title;
                session.SourceProgramId = lastSession.SourceProgramId;
                session.SourceDayId = lastSession.SourceDayId;

                foreach (var srcExercise in lastSession.Exercises.OrderBy(e => e.OrderIndex))
                {
                    var sessionExercise = new WorkoutSessionExercise
                    {
                        SessionId = session.Id,
                        SourceExerciseId = srcExercise.SourceExerciseId,
                        Name = srcExercise.Name,
                        MuscleGroup = srcExercise.MuscleGroup,
                        Notes = srcExercise.Notes,
                        OrderIndex = srcExercise.OrderIndex
                    };

                    foreach (var srcSet in srcExercise.Sets.OrderBy(s => s.OrderIndex))
                    {
                        sessionExercise.Sets.Add(new WorkoutSessionSet
                        {
                            ExerciseId = sessionExercise.Id,
                            SourceSetId = srcSet.SourceSetId,
                            OrderIndex = srcSet.OrderIndex,
                            PlannedWeight = srcSet.ActualWeight,
                            PlannedRepetitions = srcSet.ActualRepetitions,
                            PreviousWeight = srcSet.ActualWeight,
                            PreviousReps = srcSet.ActualRepetitions
                        });
                    }

                    session.Exercises.Add(sessionExercise);
                }
            }
        }
        else if (request.SourceDayId.HasValue)
        {
            var day = await dayRepository.GetByIdAsync(request.SourceDayId.Value, ct)
                ?? throw new KeyNotFoundException("Программа дня не найдена");

            session.SourceDayId = day.Id;
            session.SourceProgramId = day.ProgramId;
            session.Title = day.Title ?? session.Title;

            var exercises = await exerciseRepository.GetByDayIdAsync(day.Id, ct);

            var orderIndex = 0;
            foreach (var exercise in exercises)
            {
                var sessionExercise = new WorkoutSessionExercise
                {
                    SessionId = session.Id,
                    SourceExerciseId = exercise.Id,
                    Name = exercise.Name,
                    MuscleGroup = exercise.MuscleGroup,
                    Notes = exercise.Notes,
                    OrderIndex = orderIndex++
                };

                var sets = await setRepository.GetByExerciseIdAsync(exercise.Id, ct);
                var setOrder = 0;
                foreach (var set in sets)
                {
                    sessionExercise.Sets.Add(new WorkoutSessionSet
                    {
                        ExerciseId = sessionExercise.Id,
                        SourceSetId = set.Id,
                        OrderIndex = setOrder++,
                        PlannedWeight = set.Weight.HasValue ? (decimal)set.Weight.Value : null,
                        PlannedRepetitions = set.Repetitions,
                        PlannedDurationSeconds = set.Duration.HasValue ? (int)set.Duration.Value.TotalSeconds : null
                    });
                }

                var prevSession = await sessionRepository.GetLastWithExerciseAsync(request.UserId, exercise.Name, ct);
                if (prevSession != null)
                {
                    var prevExercise = prevSession.Exercises.FirstOrDefault(e => e.Name == exercise.Name);
                    if (prevExercise != null)
                    {
                        foreach (var sessionSet in sessionExercise.Sets)
                        {
                            var prevSet = prevExercise.Sets
                                .FirstOrDefault(s => s.OrderIndex == sessionSet.OrderIndex && s.CompletedAt != null);
                            if (prevSet != null)
                            {
                                sessionSet.PreviousWeight = prevSet.ActualWeight;
                                sessionSet.PreviousReps = prevSet.ActualRepetitions;
                            }
                        }
                    }
                }

                session.Exercises.Add(sessionExercise);
            }
        }

        var created = await sessionRepository.CreateAsync(session, ct);
        return SessionMapper.ToDto(created);
    }
}
