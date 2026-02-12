using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BloodTracker.Infrastructure.Services;

public sealed class DataMigrationService
{
    private const int CurrentMigrationVersion = 1;
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
    /// Also reassigns orphaned data from placeholder users (admin@bloodtracker.local)
    /// to real users when they log in.
    /// 
    /// Migration version tracking ensures this only runs once per user database.
    /// </summary>
    public void MigrateIfNeeded()
    {
        try
        {
            var connStr = _dbSettings.ConnectionString;
            var oldDbPath = connStr.Replace("Filename=", "").Split(';')[0];

            if (!Path.IsPathRooted(oldDbPath))
                oldDbPath = Path.GetFullPath(oldDbPath);

            var dir = Path.GetDirectoryName(oldDbPath) ?? ".";

            // Phase 1: migrate old bloodtracker.db if it exists and no users yet
            if (File.Exists(oldDbPath) && _authDb.Users.Count() == 0)
            {
                var adminUser = new AppUser
                {
                    Email = "admin@bloodtracker.local",
                    DisplayName = "Admin",
                    LastLoginAt = DateTime.UtcNow
                };
                _authDb.Users.Insert(adminUser);

                var newDbPath = Path.Combine(dir, $"user_{adminUser.Id}.db");
                File.Copy(oldDbPath, newDbPath, overwrite: false);

                // Mark migration as completed for this user database
                MarkMigrationCompleted(newDbPath);

                _logger.LogInformation(
                    "Migrated existing data: created placeholder user {UserId}, copied DB to {NewDbPath}",
                    adminUser.Id, newDbPath);

                var backupPath = oldDbPath + ".bak";
                if (!File.Exists(backupPath))
                {
                    File.Move(oldDbPath, backupPath);
                    _logger.LogInformation("Backed up original DB to {BackupPath}", backupPath);
                }
            }
            else if (!File.Exists(oldDbPath))
            {
                _logger.LogInformation("No existing bloodtracker.db found, skipping initial migration");
            }

            // Phase 2: reassign data from placeholder user to a real user
            ReassignPlaceholderData(dir);

            // Phase 3: adopt orphaned DB files (no matching user in auth.db)
            AdoptOrphanedDatabases(dir);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Data migration failed");
        }
    }

    private void ReassignPlaceholderData(string dir)
    {
        var placeholder = _authDb.Users.FindOne(u => u.Email == "admin@bloodtracker.local");
        if (placeholder is null) return;

        var realUser = _authDb.Users.FindOne(u => u.Email != "admin@bloodtracker.local");
        if (realUser is null)
        {
            _logger.LogInformation("No real users yet, keeping placeholder data");
            return;
        }

        var placeholderDb = Path.Combine(dir, $"user_{placeholder.Id}.db");
        var realUserDb = Path.Combine(dir, $"user_{realUser.Id}.db");

        if (!File.Exists(placeholderDb))
        {
            _logger.LogInformation("Placeholder DB not found, nothing to reassign");
            _authDb.Users.Delete(placeholder.Id);
            return;
        }

        // Check if migration already completed for the real user DB
        if (File.Exists(realUserDb) && IsMigrationCompleted(realUserDb))
        {
            _logger.LogInformation("Migration already completed for user {UserId}, skipping", realUser.Id);
            return;
        }

        if (!File.Exists(realUserDb) || new FileInfo(realUserDb).Length < new FileInfo(placeholderDb).Length)
        {
            if (File.Exists(realUserDb))
            {
                File.Move(realUserDb, realUserDb + ".old", overwrite: true);
                _logger.LogInformation("Backed up smaller DB to {Path}", realUserDb + ".old");
            }

            File.Move(placeholderDb, realUserDb);
            MarkMigrationCompleted(realUserDb);

            _logger.LogInformation(
                "Reassigned data from placeholder to {Email} (user {UserId})",
                realUser.Email, realUser.Id);
        }

        _authDb.Users.Delete(placeholder.Id);
        _logger.LogInformation("Removed placeholder user admin@bloodtracker.local");
    }

    /// <summary>
    /// Finds user_*.db files that don't belong to any user in auth.db.
    /// If the first real user has a smaller DB, adopts the largest orphan.
    /// </summary>
    private void AdoptOrphanedDatabases(string dir)
    {
        var allUsers = _authDb.Users.FindAll().ToList();
        if (allUsers.Count == 0) return;

        var knownIds = allUsers.Select(u => u.Id.ToString()).ToHashSet();

        var orphans = Directory.GetFiles(dir, "user_*.db")
            .Where(f =>
            {
                var name = Path.GetFileNameWithoutExtension(f);
                var id = name.Replace("user_", "");
                return !knownIds.Contains(id);
            })
            .OrderByDescending(f => new FileInfo(f).Length)
            .ToList();

        if (orphans.Count == 0) return;

        var largestOrphan = orphans[0];
        var orphanSize = new FileInfo(largestOrphan).Length;

        // Find the first admin user, or fallback to first user
        var targetUser = allUsers.FirstOrDefault(u => u.IsAdmin) ?? allUsers[0];
        var targetDb = Path.Combine(dir, $"user_{targetUser.Id}.db");
        var targetSize = File.Exists(targetDb) ? new FileInfo(targetDb).Length : 0;

        // Skip if migration already completed for target DB
        if (File.Exists(targetDb) && IsMigrationCompleted(targetDb))
        {
            _logger.LogInformation("Migration already completed for target user {UserId}, skipping orphan adoption", targetUser.Id);
            return;
        }

        if (orphanSize > targetSize)
        {
            if (File.Exists(targetDb))
            {
                File.Move(targetDb, targetDb + ".pre-adopt", overwrite: true);
                _logger.LogInformation("Backed up existing DB before adoption: {Path}", targetDb + ".pre-adopt");
            }

            File.Move(largestOrphan, targetDb);
            MarkMigrationCompleted(targetDb);

            _logger.LogInformation(
                "Adopted orphaned DB ({OrphanSize} bytes) for {Email} (user {UserId})",
                orphanSize, targetUser.Email, targetUser.Id);
        }
        else
        {
            _logger.LogInformation(
                "Found {Count} orphaned DB(s) but target user already has larger data ({TargetSize} >= {OrphanSize})",
                orphans.Count, targetSize, orphanSize);
        }
    }

    /// <summary>
    /// Checks if migration has already been completed for a specific user database.
    /// </summary>
    private bool IsMigrationCompleted(string dbPath)
    {
        try
        {
            using var db = new LiteDB.LiteDatabase($"Filename={dbPath};Connection=shared");
            var metadata = db.GetCollection("_migration_metadata");
            var record = metadata.FindById("migration_version");
            
            if (record == null)
                return false;

            var version = record["version"].AsInt32;
            return version >= CurrentMigrationVersion;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check migration version for {DbPath}", dbPath);
            return false;
        }
    }

    /// <summary>
    /// Marks migration as completed in the user database metadata collection.
    /// </summary>
    private void MarkMigrationCompleted(string dbPath)
    {
        try
        {
            using var db = new LiteDB.LiteDatabase($"Filename={dbPath};Connection=shared");
            var metadata = db.GetCollection("_migration_metadata");
            
            metadata.Upsert(new LiteDB.BsonDocument
            {
                ["_id"] = "migration_version",
                ["version"] = CurrentMigrationVersion,
                ["completedAt"] = DateTime.UtcNow.ToString("O")
            });

            _logger.LogInformation("Marked migration v{Version} as completed for {DbPath}", CurrentMigrationVersion, dbPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark migration as completed for {DbPath}", dbPath);
        }
    }
}
