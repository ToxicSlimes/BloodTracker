using BloodTracker.Domain.Models;
using LiteDB;
using Microsoft.Extensions.Options;

namespace BloodTracker.Infrastructure.Persistence;

public sealed class DatabaseSettings
{
    public string ConnectionString { get; set; } = "Filename=bloodtracker.db;Connection=shared";
}

public sealed class BloodTrackerDbContext : IDisposable
{
    private readonly LiteDatabase _database;

    public BloodTrackerDbContext(IOptions<DatabaseSettings> settings)
    {
        _database = new LiteDatabase(settings.Value.ConnectionString, new BsonMapper());
        
        Analyses.EnsureIndex(x => x.Date);
        Courses.EnsureIndex(x => x.IsActive);
        IntakeLogs.EnsureIndex(x => x.Date);
    }

    public ILiteCollection<Analysis> Analyses => _database.GetCollection<Analysis>("analyses");
    public ILiteCollection<Course> Courses => _database.GetCollection<Course>("courses");
    public ILiteCollection<Drug> Drugs => _database.GetCollection<Drug>("drugs");
    public ILiteCollection<IntakeLog> IntakeLogs => _database.GetCollection<IntakeLog>("intake_logs");

    public void Dispose() => _database.Dispose();
}
