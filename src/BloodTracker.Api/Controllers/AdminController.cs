using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BloodTracker.Api.Controllers;

[Authorize(Policy = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class AdminController(
    AuthDbContext authDb,
    IAuthService authService,
    IOptions<DatabaseSettings> dbSettings,
    ILogger<AdminController> logger) : ControllerBase
{
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
    public sealed record UpdateRoleRequest(bool IsAdmin);
    public sealed record ImpersonateResponse(string Token, string Email, string? DisplayName);

    private string GetDbDir()
    {
        var connStr = dbSettings.Value.ConnectionString;
        var filename = connStr.Replace("Filename=", "").Split(';')[0];
        return Path.GetDirectoryName(Path.GetFullPath(filename)) ?? ".";
    }

    private string GetUserDbPath(Guid userId)
        => Path.Combine(GetDbDir(), $"user_{userId}.db");

    [HttpGet("users")]
    public ActionResult<List<AdminUserDto>> GetUsers()
    {
        var users = authDb.Users.FindAll().ToList();
        var result = new List<AdminUserDto>();

        foreach (var u in users)
        {
            var dbPath = GetUserDbPath(u.Id);
            int analyses = 0, courses = 0, drugs = 0, workouts = 0;

            if (System.IO.File.Exists(dbPath))
            {
                try
                {
                    using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                    analyses = db.Analyses.Count();
                    courses = db.Courses.Count();
                    drugs = db.Drugs.Count();
                    workouts = db.WorkoutPrograms.Count();
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to read user DB for {UserId}", u.Id);
                }
            }

            result.Add(new AdminUserDto(
                u.Id, u.Email, u.DisplayName, u.IsAdmin,
                u.CreatedAt, u.LastLoginAt,
                analyses, courses, drugs, workouts));
        }

        return Ok(result.OrderByDescending(u => u.CreatedAt).ToList());
    }

    [HttpGet("users/{id:guid}/summary")]
    public ActionResult<AdminUserSummaryDto> GetUserSummary(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        var dbPath = GetUserDbPath(id);
        var analyses = new List<AdminAnalysisBrief>();
        AdminCourseBrief? activeCourse = null;
        int drugCount = 0, workoutCount = 0;
        long dbSize = 0;

        if (System.IO.File.Exists(dbPath))
        {
            dbSize = new FileInfo(dbPath).Length;
            try
            {
                using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                analyses = db.Analyses.FindAll()
                    .OrderByDescending(a => a.Date)
                    .Select(a => new AdminAnalysisBrief(a.Id, a.Date, a.Label))
                    .ToList();
                var course = db.Courses.FindOne(c => c.IsActive);
                if (course is not null)
                    activeCourse = new AdminCourseBrief(course.Title, course.StartDate, course.EndDate, course.IsActive);
                drugCount = db.Drugs.Count();
                workoutCount = db.WorkoutPrograms.Count();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read user DB for summary {UserId}", id);
            }
        }

        return Ok(new AdminUserSummaryDto(
            user.Id, user.Email, user.DisplayName, user.IsAdmin,
            user.CreatedAt, user.LastLoginAt,
            analyses, activeCourse, drugCount, workoutCount, dbSize));
    }

    [HttpGet("stats")]
    public ActionResult<AdminStatsDto> GetStats()
    {
        var users = authDb.Users.FindAll().ToList();
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        int activeRecent = users.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= sevenDaysAgo);
        long totalDbSize = 0;
        int totalAnalyses = 0, totalCourses = 0, totalWorkouts = 0;

        foreach (var u in users)
        {
            var dbPath = GetUserDbPath(u.Id);
            if (System.IO.File.Exists(dbPath))
            {
                totalDbSize += new FileInfo(dbPath).Length;
                try
                {
                    using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                    totalAnalyses += db.Analyses.Count();
                    totalCourses += db.Courses.Count();
                    totalWorkouts += db.WorkoutPrograms.Count();
                }
                catch { }
            }
        }

        // Add auth.db size
        var authDbPath = Path.Combine(GetDbDir(), "auth.db");
        if (System.IO.File.Exists(authDbPath))
            totalDbSize += new FileInfo(authDbPath).Length;

        // Registrations by day (last 30 days)
        var thirtyDaysAgo = now.AddDays(-30);
        var recentRegs = users
            .Where(u => u.CreatedAt >= thirtyDaysAgo)
            .GroupBy(u => u.CreatedAt.ToString("yyyy-MM-dd"))
            .Select(g => new RegistrationDay(g.Key, g.Count()))
            .OrderBy(r => r.Date)
            .ToList();

        return Ok(new AdminStatsDto(
            users.Count, totalDbSize, activeRecent,
            totalAnalyses, totalCourses, totalWorkouts,
            recentRegs));
    }

    [HttpPut("users/{id:guid}/role")]
    public ActionResult UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        user.IsAdmin = request.IsAdmin;
        authDb.Users.Update(user);

        logger.LogInformation("Admin toggled role for {Email}: IsAdmin={IsAdmin}", user.Email, request.IsAdmin);
        return Ok(new { user.Email, user.IsAdmin });
    }

    [HttpDelete("users/{id:guid}")]
    public ActionResult DeleteUser(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        // Delete user DB file
        var dbPath = GetUserDbPath(id);
        if (System.IO.File.Exists(dbPath))
        {
            try { System.IO.File.Delete(dbPath); }
            catch (Exception ex) { logger.LogWarning(ex, "Failed to delete user DB file: {Path}", dbPath); }
        }

        // Remove from auth DB
        authDb.Users.Delete(id);
        authDb.AuthCodes.DeleteMany(c => c.Email == user.Email);

        logger.LogInformation("Admin deleted user {Email} ({UserId})", user.Email, id);
        return NoContent();
    }

    [HttpGet("impersonate/{id:guid}")]
    public ActionResult<ImpersonateResponse> Impersonate(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        var token = authService.GenerateImpersonationToken(user);
        logger.LogInformation("Admin impersonating user {Email} ({UserId})", user.Email, id);

        return Ok(new ImpersonateResponse(token, user.Email, user.DisplayName));
    }
}
