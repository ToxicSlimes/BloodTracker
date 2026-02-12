namespace BloodTracker.Application.Admin.Dto;

public sealed record AdminUserDto(
    Guid Id, string Email, string? DisplayName, bool IsAdmin,
    DateTime CreatedAt, DateTime? LastLoginAt,
    int AnalysesCount, int CoursesCount, int DrugsCount, int WorkoutsCount);

public sealed record AdminUserSummaryDto(
    Guid Id, string Email, string? DisplayName, bool IsAdmin,
    DateTime CreatedAt, DateTime? LastLoginAt,
    List<AdminAnalysisBrief> Analyses, AdminCourseBrief? ActiveCourse,
    int DrugCount, int WorkoutProgramCount, long DbSizeBytes);

public sealed record AdminAnalysisBrief(Guid Id, DateTime Date, string Label);

public sealed record AdminCourseBrief(string Title, DateTime? StartDate, DateTime? EndDate, bool IsActive);

public sealed record AdminStatsDto(
    int TotalUsers, long TotalDbSizeBytes, int ActiveUsersLast7Days,
    int TotalAnalyses, int TotalCourses, int TotalWorkouts,
    List<RegistrationDay> RecentRegistrations);

public sealed record RegistrationDay(string Date, int Count);
