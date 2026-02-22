using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class ExerciseCatalogSeedService(CatalogDbContext db, ILogger<ExerciseCatalogSeedService> logger)
{
    private const int CurrentVersion = 1;

    private static readonly JsonSerializerOptions CatalogJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public void SeedIfNeeded()
    {
        var meta = db.Metadata.FindById("exercise_seed_version");
        var existingVersion = meta?["version"].AsInt32 ?? 0;

        if (existingVersion >= CurrentVersion)
        {
            logger.LogInformation("Exercise catalog is up to date (v{Version})", existingVersion);
            return;
        }

        logger.LogInformation("Seeding exercise catalog v{Version}...", CurrentVersion);

        db.ExerciseCatalog.DeleteAll();

        var catalog = LoadCatalogFromJson();

        db.ExerciseCatalog.InsertBulk(catalog.Exercises);

        db.Metadata.Upsert("exercise_seed_version", new LiteDB.BsonDocument
        {
            ["_id"] = "exercise_seed_version",
            ["version"] = CurrentVersion,
            ["seededAt"] = DateTime.UtcNow.ToString("O")
        });

        logger.LogInformation("Seeded {Count} exercises", catalog.Exercises.Count);
    }

    private ExerciseCatalogData LoadCatalogFromJson()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            var resourceName = "BloodTracker.Infrastructure.Data.exercise-catalog.json";

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null)
            {
                logger.LogWarning("Embedded exercise catalog not found, trying file path");
                return LoadCatalogFromFile();
            }

            using var reader = new StreamReader(stream);
            var json = reader.ReadToEnd();

            var catalog = JsonSerializer.Deserialize<ExerciseCatalogData>(json, CatalogJsonOptions);

            if (catalog == null || catalog.Exercises.Count == 0)
            {
                throw new InvalidOperationException("Exercise catalog JSON is empty or invalid");
            }

            return catalog;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load exercise catalog from embedded resource");
            throw;
        }
    }

    private ExerciseCatalogData LoadCatalogFromFile()
    {
        var filePath = Path.Combine(
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? ".",
            "Data",
            "exercise-catalog.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Exercise catalog file not found: {filePath}");
        }

        var json = File.ReadAllText(filePath);
        var catalog = JsonSerializer.Deserialize<ExerciseCatalogData>(json, CatalogJsonOptions);

        if (catalog == null || catalog.Exercises.Count == 0)
        {
            throw new InvalidOperationException("Exercise catalog JSON is empty or invalid");
        }

        return catalog;
    }

    private sealed class ExerciseCatalogData
    {
        public int Version { get; set; }
        public List<ExerciseCatalogEntry> Exercises { get; set; } = new();
    }
}
