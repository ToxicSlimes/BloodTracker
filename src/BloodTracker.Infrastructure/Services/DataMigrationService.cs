using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BloodTracker.Infrastructure.Services;

public sealed class DataMigrationService
{
    private readonly DatabaseSettings _dbSettings;
    private readonly AuthDbContext _authDb;
    private readonly ILogger<DataMigrationService> _logger;

    public DataMigrationService(
        IOptions<DatabaseSettings> dbSettings,
        AuthDbContext authDb,
        ILogger<DataMigrationService> logger)
    {
        _dbSettings = dbSettings.Value;
        _authDb = authDb;
        _logger = logger;
    }

    /// <summary>
    /// Migrates existing bloodtracker.db to user_{id}.db for the first user.
    /// Only runs once — if the old DB exists and no users exist yet.
    /// </summary>
    public void MigrateIfNeeded()
    {
        try
        {
            var connStr = _dbSettings.ConnectionString;
            var oldDbPath = connStr.Replace("Filename=", "").Split(';')[0];

            // Make path absolute if relative
            if (!Path.IsPathRooted(oldDbPath))
                oldDbPath = Path.GetFullPath(oldDbPath);

            if (!File.Exists(oldDbPath))
            {
                _logger.LogInformation("No existing bloodtracker.db found, skipping migration");
                return;
            }

            // Check if we already have users — if so, migration already happened
            if (_authDb.Users.Count() > 0)
            {
                _logger.LogInformation("Users already exist, skipping migration");
                return;
            }

            // Create admin user
            var adminUser = new AppUser
            {
                Email = "admin@bloodtracker.local",
                DisplayName = "Admin",
                LastLoginAt = DateTime.UtcNow
            };
            _authDb.Users.Insert(adminUser);

            // Copy existing DB to user-specific DB
            var dir = Path.GetDirectoryName(oldDbPath) ?? ".";
            var newDbPath = Path.Combine(dir, $"user_{adminUser.Id}.db");

            File.Copy(oldDbPath, newDbPath, overwrite: false);

            _logger.LogInformation(
                "Migrated existing data: created admin user {UserId}, copied DB to {NewDbPath}",
                adminUser.Id, newDbPath);

            // Rename old DB to backup
            var backupPath = oldDbPath + ".bak";
            if (!File.Exists(backupPath))
            {
                File.Move(oldDbPath, backupPath);
                _logger.LogInformation("Backed up original DB to {BackupPath}", backupPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Data migration failed");
        }
    }
}
