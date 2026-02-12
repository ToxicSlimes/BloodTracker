using BloodTracker.Application.Admin.Dto;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BloodTracker.Infrastructure.Persistence.Repositories;

public sealed class AdminRepository : IAdminRepository
{
    private readonly AuthDbContext _authDb;
    private readonly IOptions<DatabaseSettings> _dbSettings;
    private readonly ILogger<AdminRepository> _logger;

    public AdminRepository(
        AuthDbContext authDb,
        IOptions<DatabaseSettings> dbSettings,
        ILogger<AdminRepository> logger)
    {
        _authDb = authDb;
        _dbSettings = dbSettings;
        _logger = logger;
    }

    public Task<List<AppUser>> GetAllUsersAsync(CancellationToken ct = default)
    {
        var users = _authDb.Users.FindAll().ToList();
        return Task.FromResult(users);
    }

    public Task<AppUser?> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = _authDb.Users.FindById(userId);
        return Task.FromResult(user);
    }

    public async Task<UserDbStats> GetUserDbStatsAsync(Guid userId, CancellationToken ct = default)
    {
        var dbPath = GetUserDbPath(userId);
        
        if (!File.Exists(dbPath))
        {
            return new UserDbStats(0, 0, 0, 0, 0);
        }

        var dbSize = new FileInfo(dbPath).Length;
        
        try
        {
            using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
            var analyses = db.Analyses.Count();
            var courses = db.Courses.Count();
            var drugs = db.Drugs.Count();
            var workouts = db.WorkoutPrograms.Count();

            return new UserDbStats(analyses, courses, drugs, workouts, dbSize);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read user DB stats for {UserId}", userId);
            return new UserDbStats(0, 0, 0, 0, dbSize);
        }
    }

    public async Task<List<AdminAnalysisBrief>> GetUserAnalysesAsync(Guid userId, CancellationToken ct = default)
    {
        var dbPath = GetUserDbPath(userId);
        
        if (!File.Exists(dbPath))
        {
            return new List<AdminAnalysisBrief>();
        }

        try
        {
            using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
            return db.Analyses.FindAll()
                .OrderByDescending(a => a.Date)
                .Select(a => new AdminAnalysisBrief(a.Id, a.Date, a.Label))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read user analyses for {UserId}", userId);
            return new List<AdminAnalysisBrief>();
        }
    }

    public async Task<AdminCourseBrief?> GetUserActiveCourseAsync(Guid userId, CancellationToken ct = default)
    {
        var dbPath = GetUserDbPath(userId);
        
        if (!File.Exists(dbPath))
        {
            return null;
        }

        try
        {
            using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
            var course = db.Courses.FindOne(c => c.IsActive);
            
            return course is not null
                ? new AdminCourseBrief(course.Title, course.StartDate, course.EndDate, course.IsActive)
                : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read active course for {UserId}", userId);
            return null;
        }
    }

    public async Task<long> GetTotalDbSizeAsync(CancellationToken ct = default)
    {
        var users = _authDb.Users.FindAll().ToList();
        long totalSize = 0;

        foreach (var user in users)
        {
            var dbPath = GetUserDbPath(user.Id);
            if (File.Exists(dbPath))
            {
                totalSize += new FileInfo(dbPath).Length;
            }
        }

        // Add auth.db size
        var authDbPath = Path.Combine(GetDbDir(), "auth.db");
        if (File.Exists(authDbPath))
        {
            totalSize += new FileInfo(authDbPath).Length;
        }

        return totalSize;
    }

    public async Task<(int totalAnalyses, int totalCourses, int totalWorkouts)> GetAggregateStatsAsync(CancellationToken ct = default)
    {
        var users = _authDb.Users.FindAll().ToList();
        int totalAnalyses = 0, totalCourses = 0, totalWorkouts = 0;

        foreach (var user in users)
        {
            var dbPath = GetUserDbPath(user.Id);
            if (!File.Exists(dbPath))
                continue;

            try
            {
                using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                totalAnalyses += db.Analyses.Count();
                totalCourses += db.Courses.Count();
                totalWorkouts += db.WorkoutPrograms.Count();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read aggregate stats for user {UserId}", user.Id);
            }
        }

        return (totalAnalyses, totalCourses, totalWorkouts);
    }

    public Task UpdateUserRoleAsync(Guid userId, bool isAdmin, CancellationToken ct = default)
    {
        var user = _authDb.Users.FindById(userId);
        if (user is null)
        {
            throw new InvalidOperationException($"User {userId} not found");
        }

        user.IsAdmin = isAdmin;
        _authDb.Users.Update(user);

        _logger.LogInformation("Admin toggled role for {Email}: IsAdmin={IsAdmin}", user.Email, isAdmin);
        return Task.CompletedTask;
    }

    public Task DeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = _authDb.Users.FindById(userId);
        if (user is null)
        {
            throw new InvalidOperationException($"User {userId} not found");
        }

        // Delete user DB file
        var dbPath = GetUserDbPath(userId);
        if (File.Exists(dbPath))
        {
            try
            {
                File.Delete(dbPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete user DB file: {Path}", dbPath);
            }
        }

        // Remove from auth DB
        _authDb.Users.Delete(userId);
        _authDb.AuthCodes.DeleteMany(c => c.Email == user.Email);

        _logger.LogInformation("Admin deleted user {Email} ({UserId})", user.Email, userId);
        return Task.CompletedTask;
    }

    private string GetDbDir()
    {
        var connStr = _dbSettings.Value.ConnectionString;
        var filename = connStr.Replace("Filename=", "").Split(';')[0];
        return Path.GetDirectoryName(Path.GetFullPath(filename)) ?? ".";
    }

    private string GetUserDbPath(Guid userId)
        => Path.Combine(GetDbDir(), $"user_{userId}.db");
}
