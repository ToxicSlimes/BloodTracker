using BloodTracker.Domain.Models;
using BloodTracker.Domain.Models.ValueObjects;
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

    public BloodTrackerDbContext(string connectionString)
    {
        var mapper = new BsonMapper();
        RegisterValueObjectSerializers(mapper);
        _database = new LiteDatabase(connectionString, mapper);
        EnsureIndexes();
    }

    /// <summary>
    /// Registers custom BsonMapper serializers for domain value objects.
    /// Dosage ↔ string, Money ↔ decimal, DateRange ↔ {start, end} document.
    /// </summary>
    private static void RegisterValueObjectSerializers(BsonMapper mapper)
    {
        mapper.RegisterType(
            serialize: d => d.Value,
            deserialize: bson => new Dosage(bson.AsString));

        mapper.RegisterType(
            serialize: m => m.Amount,
            deserialize: bson => new Money(bson.AsDecimal));

        mapper.RegisterType(
            serialize: r => new BsonDocument
            {
                ["start"] = r.Start,
                ["end"] = r.End
            },
            deserialize: bson => new DateRange(
                bson.AsDocument["start"].AsDateTime,
                bson.AsDocument["end"].AsDateTime));
    }

    public BloodTrackerDbContext(IOptions<DatabaseSettings> settings)
        : this(settings.Value.ConnectionString)
    {
    }

    private void EnsureIndexes()
    {
        Analyses.EnsureIndex(x => x.Date);
        Courses.EnsureIndex(x => x.IsActive);
        IntakeLogs.EnsureIndex(x => x.Date);
        IntakeLogs.EnsureIndex(x => x.DrugId);
        Purchases.EnsureIndex(x => x.DrugId);
        Purchases.EnsureIndex(x => x.PurchaseDate);
        WorkoutDays.EnsureIndex(x => x.ProgramId);
        WorkoutDays.EnsureIndex(x => x.DayOfWeek);
        WorkoutExercises.EnsureIndex(x => x.ProgramId);
        WorkoutExercises.EnsureIndex(x => x.DayId);
        WorkoutSets.EnsureIndex(x => x.ExerciseId);
        ExerciseCatalog.EnsureIndex(x => x.Id, unique: true);
        ExerciseCatalog.EnsureIndex(x => x.MuscleGroup);
    }

    public ILiteCollection<Analysis> Analyses => _database.GetCollection<Analysis>("analyses");
    public ILiteCollection<Course> Courses => _database.GetCollection<Course>("courses");
    public ILiteCollection<Drug> Drugs => _database.GetCollection<Drug>("drugs");
    public ILiteCollection<IntakeLog> IntakeLogs => _database.GetCollection<IntakeLog>("intake_logs");
    public ILiteCollection<Purchase> Purchases => _database.GetCollection<Purchase>("purchases");
    public ILiteCollection<WorkoutProgram> WorkoutPrograms => _database.GetCollection<WorkoutProgram>("workout_programs");
    public ILiteCollection<WorkoutDay> WorkoutDays => _database.GetCollection<WorkoutDay>("workout_days");
    public ILiteCollection<WorkoutExercise> WorkoutExercises => _database.GetCollection<WorkoutExercise>("workout_exercises");
    public ILiteCollection<WorkoutSet> WorkoutSets => _database.GetCollection<WorkoutSet>("workout_sets");
    public ILiteCollection<ExerciseCatalogEntry> ExerciseCatalog => _database.GetCollection<ExerciseCatalogEntry>("exercise_catalog");

    public void Dispose() => _database.Dispose();
}
