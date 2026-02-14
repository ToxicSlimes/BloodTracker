using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Application.WorkoutDiary.Queries;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class GetActiveWorkoutSessionHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetActiveWorkoutSessionQuery, WorkoutSessionDto?>
{
    public async Task<WorkoutSessionDto?> Handle(GetActiveWorkoutSessionQuery request, CancellationToken ct)
    {
        var session = await sessionRepository.GetActiveAsync(request.UserId, ct);
        return session != null ? MapToDto(session) : null;
    }

    private static WorkoutSessionDto MapToDto(WorkoutSession s) => SessionMapper.ToDto(s);
}

public sealed class GetWorkoutSessionHistoryHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetWorkoutSessionHistoryQuery, Common.PagedResult<WorkoutSessionDto>>
{
    public async Task<Common.PagedResult<WorkoutSessionDto>> Handle(GetWorkoutSessionHistoryQuery request, CancellationToken ct)
    {
        var skip = (request.Page - 1) * request.PageSize;
        var items = await sessionRepository.GetHistoryAsync(request.UserId, request.FromDate, request.ToDate, skip, request.PageSize, ct);
        var total = await sessionRepository.GetHistoryCountAsync(request.UserId, request.FromDate, request.ToDate, ct);

        return new Common.PagedResult<WorkoutSessionDto>(
            items.Select(SessionMapper.ToDto).ToList(),
            total,
            request.Page,
            request.PageSize
        );
    }
}

public sealed class GetWorkoutSessionByIdHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetWorkoutSessionByIdQuery, WorkoutSessionDto?>
{
    public async Task<WorkoutSessionDto?> Handle(GetWorkoutSessionByIdQuery request, CancellationToken ct)
    {
        var session = await sessionRepository.GetByIdAsync(request.SessionId, ct);
        if (session == null || session.UserId != request.UserId) return null;
        return SessionMapper.ToDto(session);
    }
}

public sealed class GetPreviousExerciseDataHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetPreviousExerciseDataQuery, PreviousExerciseDataDto?>
{
    public async Task<PreviousExerciseDataDto?> Handle(GetPreviousExerciseDataQuery request, CancellationToken ct)
    {
        var session = await sessionRepository.GetLastWithExerciseAsync(request.UserId, request.ExerciseName, ct);
        if (session == null) return null;

        var exercise = session.Exercises.FirstOrDefault(e => e.Name == request.ExerciseName);
        if (exercise == null) return null;

        return new PreviousExerciseDataDto
        {
            ExerciseName = exercise.Name,
            SessionDate = session.StartedAt,
            Sets = exercise.Sets
                .Where(s => s.CompletedAt != null)
                .OrderBy(s => s.OrderIndex)
                .Select(s => new PreviousSetDto
                {
                    Weight = s.ActualWeight,
                    Repetitions = s.ActualRepetitions,
                    RPE = s.RPE
                }).ToList()
        };
    }
}

public sealed class GetWorkoutDurationEstimateHandler(
    IWorkoutExerciseRepository exerciseRepository,
    IWorkoutSetRepository setRepository,
    IWorkoutStatsRepository statsRepository)
    : IRequestHandler<GetWorkoutDurationEstimateQuery, WorkoutDurationEstimateDto>
{
    public async Task<WorkoutDurationEstimateDto> Handle(GetWorkoutDurationEstimateQuery request, CancellationToken ct)
    {
        var exercises = await exerciseRepository.GetByDayIdAsync(request.SourceDayId, ct);
        var totalSets = 0;

        foreach (var exercise in exercises)
        {
            var sets = await setRepository.GetByExerciseIdAsync(exercise.Id, ct);
            totalSets += sets.Count;
        }

        var avgRest = await statsRepository.GetAverageRestSecondsAsync(request.UserId, ct);
        if (avgRest == 0) avgRest = 90;

        var setDurationSeconds = 30;
        var totalSeconds = totalSets * (setDurationSeconds + avgRest);

        return new WorkoutDurationEstimateDto
        {
            EstimatedMinutes = totalSeconds / 60,
            AverageRestSeconds = avgRest,
            TotalSets = totalSets
        };
    }
}

public sealed class GetWeekStatusHandler(IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetWeekStatusQuery, WeekStatusDto>
{
    public async Task<WeekStatusDto> Handle(GetWeekStatusQuery request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var daysSinceMonday = ((int)now.DayOfWeek + 6) % 7;
        var mondayStart = now.Date.AddDays(-daysSinceMonday);

        var sessions = await sessionRepository.GetHistoryAsync(request.UserId, mondayStart, null, 0, 50, ct);

        var weekSessions = sessions
            .Select(s => new WeekSessionEntryDto
            {
                SourceDayId = s.SourceDayId,
                DayOfWeek = (int)s.StartedAt.DayOfWeek,
                SessionId = s.Id,
                CompletedAt = s.CompletedAt?.ToString("o") ?? s.StartedAt.ToString("o"),
                Title = s.Title
            }).ToList();

        var activeSession = await sessionRepository.GetActiveAsync(request.UserId, ct);
        ActiveSessionInfoDto? activeInfo = null;
        if (activeSession != null)
        {
            activeInfo = new ActiveSessionInfoDto
            {
                Id = activeSession.Id,
                Title = activeSession.Title,
                StartedAt = activeSession.StartedAt.ToString("o")
            };
        }

        return new WeekStatusDto
        {
            CurrentWeekSessions = weekSessions,
            ActiveSession = activeInfo
        };
    }
}

internal static class SessionMapper
{
    public static WorkoutSessionDto ToDto(WorkoutSession session) => new()
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
