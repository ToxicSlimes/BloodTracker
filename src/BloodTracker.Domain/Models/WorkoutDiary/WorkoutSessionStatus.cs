namespace BloodTracker.Domain.Models.WorkoutDiary;

public enum WorkoutSessionStatus
{
    InProgress = 0,
    Completed = 1,
    Abandoned = 2
}

public enum SetType
{
    Working = 0,
    Warmup = 1,
    Failure = 2,
    Drop = 3
}

public enum SetComparison
{
    NoPrevious = 0,
    Better = 1,
    Same = 2,
    Worse = 3
}
