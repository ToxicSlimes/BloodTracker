using BloodTracker.Application.Common;
using BloodTracker.Application.WorkoutDiary.Dto;
using BloodTracker.Application.WorkoutDiary.Queries;
using BloodTracker.Domain.Models.WorkoutDiary;
using MediatR;

namespace BloodTracker.Application.WorkoutDiary.Handlers;

public sealed class GetExerciseProgressHandler(IWorkoutStatsRepository statsRepository)
    : IRequestHandler<GetExerciseProgressQuery, ExerciseProgressDto>
{
    public async Task<ExerciseProgressDto> Handle(GetExerciseProgressQuery request, CancellationToken ct)
    {
        var stats = await statsRepository.GetExerciseProgressAsync(request.UserId, request.ExerciseName, request.From, request.To, ct);
        var pr = await statsRepository.GetExercisePRAsync(request.UserId, request.ExerciseName, ct);

        return new ExerciseProgressDto
        {
            ExerciseName = request.ExerciseName,
            DataPoints = stats.Select(s => new ExerciseProgressPointDto
            {
                Date = s.Date,
                MaxWeight = s.MaxWeight,
                BestEstimated1RM = s.BestEstimated1RM,
                TotalSets = s.TotalSets,
                TotalReps = s.TotalReps,
                TotalTonnage = s.TotalTonnage,
                AverageRPE = s.AverageRPE
            }).ToList(),
            CurrentPR = pr != null ? MapPRToDto(pr) : null
        };
    }

    private static UserExercisePRDto MapPRToDto(UserExercisePR pr) => new()
    {
        ExerciseName = pr.ExerciseName,
        BestWeight = pr.BestWeight,
        BestWeightDate = pr.BestWeightDate,
        BestE1RM = pr.BestE1RM,
        BestE1RMDate = pr.BestE1RMDate,
        BestVolumeSingleSession = pr.BestVolumeSingleSession,
        BestVolumeDate = pr.BestVolumeDate,
        RepPRsByWeight = pr.RepPRsByWeight.ToDictionary(
            kvp => kvp.Key,
            kvp => new RepPREntryDto { Reps = kvp.Value.Reps, Date = kvp.Value.Date })
    };
}

public sealed class GetMuscleGroupProgressHandler(IWorkoutStatsRepository statsRepository)
    : IRequestHandler<GetMuscleGroupProgressQuery, MuscleGroupProgressDto>
{
    public async Task<MuscleGroupProgressDto> Handle(GetMuscleGroupProgressQuery request, CancellationToken ct)
    {
        var volumes = await statsRepository.GetWeeklyMuscleVolumeRangeAsync(request.UserId, request.From, request.To, ct);
        var filtered = volumes.Where(v => v.MuscleGroup == request.MuscleGroup).ToList();

        return new MuscleGroupProgressDto
        {
            MuscleGroup = request.MuscleGroup,
            Weekly = filtered.Select(v => new MuscleGroupProgressPointDto
            {
                Year = v.Year,
                Week = v.WeekNumber,
                TotalSets = v.TotalSets,
                TotalReps = v.TotalReps,
                TotalTonnage = v.TotalTonnage
            }).ToList()
        };
    }
}

public sealed class GetPersonalRecordsHandler(IWorkoutStatsRepository statsRepository)
    : IRequestHandler<GetPersonalRecordsQuery, PagedResult<PersonalRecordLogDto>>
{
    public async Task<PagedResult<PersonalRecordLogDto>> Handle(GetPersonalRecordsQuery request, CancellationToken ct)
    {
        var skip = (request.Page - 1) * request.PageSize;
        var logs = await statsRepository.GetPersonalRecordLogsAsync(request.UserId, request.ExerciseName, skip, request.PageSize, ct);
        var total = await statsRepository.GetPersonalRecordLogCountAsync(request.UserId, request.ExerciseName, ct);

        return new PagedResult<PersonalRecordLogDto>(
            logs.Select(l => new PersonalRecordLogDto
            {
                Id = l.Id,
                ExerciseName = l.ExerciseName,
                MuscleGroup = l.MuscleGroup.ToString(),
                RecordType = l.RecordType.ToString(),
                Value = l.Value,
                PreviousValue = l.PreviousValue,
                ImprovementPercent = l.ImprovementPercent,
                AchievedAt = l.AchievedAt
            }).ToList(),
            total,
            request.Page,
            request.PageSize);
    }
}

public sealed class GetWorkoutStatsHandler(
    IWorkoutStatsRepository statsRepository,
    IWorkoutSessionRepository sessionRepository)
    : IRequestHandler<GetWorkoutStatsQuery, WorkoutStatsDto>
{
    public async Task<WorkoutStatsDto> Handle(GetWorkoutStatsQuery request, CancellationToken ct)
    {
        var weeklyStats = await statsRepository.GetWeeklyStatsRangeAsync(request.UserId, request.From, request.To, ct);
        var totalPRs = await statsRepository.GetPersonalRecordLogCountAsync(request.UserId, null, ct);
        var avgRest = await statsRepository.GetAverageRestSecondsAsync(request.UserId, ct);

        var totalWorkouts = weeklyStats.Sum(w => w.TotalSessions);
        var totalTonnage = weeklyStats.Sum(w => w.TotalTonnage);
        var totalVolume = weeklyStats.Sum(w => w.TotalReps);
        var totalDuration = weeklyStats.Sum(w => w.TotalDurationSeconds);

        var muscleFrequency = new Dictionary<string, int>();
        var sessions = await sessionRepository.GetHistoryAsync(request.UserId, request.From, request.To, 0, 10000, ct);
        foreach (var session in sessions)
        {
            foreach (var exercise in session.Exercises)
            {
                var key = exercise.MuscleGroup.ToString();
                muscleFrequency[key] = muscleFrequency.GetValueOrDefault(key) + 1;
            }
        }

        var weeksCount = weeklyStats.Count > 0 ? weeklyStats.Count : 1;

        return new WorkoutStatsDto
        {
            TotalWorkouts = totalWorkouts,
            TotalTonnage = totalTonnage,
            TotalVolume = totalVolume,
            TotalDurationSeconds = totalDuration,
            TotalPersonalRecords = totalPRs,
            AvgTonnagePerWorkout = totalWorkouts > 0 ? Math.Round(totalTonnage / totalWorkouts, 1) : 0,
            AvgVolumePerWorkout = totalWorkouts > 0 ? totalVolume / totalWorkouts : 0,
            AvgDurationSecondsPerWorkout = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0,
            AvgRestSeconds = avgRest,
            WorkoutsPerWeek = Math.Round((decimal)totalWorkouts / weeksCount, 1),
            MuscleGroupFrequency = muscleFrequency,
            WeeklyTrend = weeklyStats.Select(w => new WeeklyStatsPointDto
            {
                Year = w.Year,
                Week = w.WeekNumber,
                Sessions = w.TotalSessions,
                Tonnage = w.TotalTonnage,
                Volume = w.TotalReps,
                DurationSeconds = w.TotalDurationSeconds
            }).ToList()
        };
    }
}

public sealed class GetStrengthLevelHandler(
    IWorkoutStatsRepository statsRepository,
    IStrengthStandardsService strengthStandardsService)
    : IRequestHandler<GetStrengthLevelQuery, StrengthLevelDto?>
{
    private static readonly string[] Levels = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"];
    private static readonly int[] Percentiles = [5, 20, 50, 80, 95];

    public async Task<StrengthLevelDto?> Handle(GetStrengthLevelQuery request, CancellationToken ct)
    {
        var standard = strengthStandardsService.GetStandard(request.ExerciseId);
        if (standard == null) return null;

        var ratios = request.Gender.Equals("female", StringComparison.OrdinalIgnoreCase)
            ? standard.Female
            : standard.Male;

        if (ratios.Length != 5) return null;

        var pr = await statsRepository.GetExercisePRAsync(request.UserId, request.ExerciseId, ct);
        var currentE1RM = pr?.BestE1RM ?? 0;
        var ratio = request.Bodyweight > 0 ? currentE1RM / request.Bodyweight : 0;

        var levelIndex = 0;
        for (var i = ratios.Length - 1; i >= 0; i--)
        {
            if (ratio >= ratios[i])
            {
                levelIndex = i;
                break;
            }
        }

        var level = Levels[levelIndex];
        var percentile = Percentiles[levelIndex];
        var nextLevel = levelIndex < Levels.Length - 1 ? Levels[levelIndex + 1] : Levels[^1];
        var nextTargetRatio = levelIndex < ratios.Length - 1 ? ratios[levelIndex + 1] : ratios[^1];
        var nextTargetWeight = nextTargetRatio * request.Bodyweight;

        var thresholds = new List<StrengthLevelThresholdDto>();
        for (var i = 0; i < Levels.Length; i++)
        {
            thresholds.Add(new StrengthLevelThresholdDto
            {
                Level = Levels[i],
                Ratio = ratios[i],
                Weight = ratios[i] * request.Bodyweight
            });
        }

        return new StrengthLevelDto
        {
            ExerciseName = request.ExerciseId,
            Level = level,
            Ratio = Math.Round(ratio, 2),
            Percentile = percentile,
            NextLevel = nextLevel,
            NextTargetWeight = Math.Round(nextTargetWeight, 1),
            CurrentE1RM = Math.Round(currentE1RM, 1),
            Bodyweight = request.Bodyweight,
            Thresholds = thresholds
        };
    }
}

public sealed class GetWorkoutCalendarHandler(IWorkoutStatsRepository statsRepository)
    : IRequestHandler<GetWorkoutCalendarQuery, List<DateTime>>
{
    public async Task<List<DateTime>> Handle(GetWorkoutCalendarQuery request, CancellationToken ct)
        => await statsRepository.GetWorkoutDatesAsync(request.UserId, request.From, request.To, ct);
}

public sealed class GetAllExercisePRsHandler(IWorkoutStatsRepository statsRepository)
    : IRequestHandler<GetAllExercisePRsQuery, List<UserExercisePRDto>>
{
    public async Task<List<UserExercisePRDto>> Handle(GetAllExercisePRsQuery request, CancellationToken ct)
    {
        var prs = await statsRepository.GetAllExercisePRsAsync(request.UserId, ct);
        return prs.Select(pr => new UserExercisePRDto
        {
            ExerciseName = pr.ExerciseName,
            BestWeight = pr.BestWeight,
            BestWeightDate = pr.BestWeightDate,
            BestE1RM = pr.BestE1RM,
            BestE1RMDate = pr.BestE1RMDate,
            BestVolumeSingleSession = pr.BestVolumeSingleSession,
            BestVolumeDate = pr.BestVolumeDate,
            RepPRsByWeight = pr.RepPRsByWeight.ToDictionary(
                kvp => kvp.Key,
                kvp => new RepPREntryDto { Reps = kvp.Value.Reps, Date = kvp.Value.Date })
        }).ToList();
    }
}
