using System.Reflection;
using System.Text.Json;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class DrugCatalogSeedService(CatalogDbContext db, ILogger<DrugCatalogSeedService> logger)
{
    private const int CurrentVersion = 4;

    public void SeedIfNeeded()
    {
        var meta = db.Metadata.FindById("seed_version");
        var existingVersion = meta?["version"].AsInt32 ?? 0;

        if (existingVersion >= CurrentVersion)
        {
            logger.LogInformation("Drug catalog is up to date (v{Version})", existingVersion);
            return;
        }

        logger.LogInformation("Seeding drug catalog v{Version}...", CurrentVersion);

        db.DrugCatalog.DeleteAll();
        db.Manufacturers.DeleteAll();

        var catalog = LoadCatalogFromJson();
        var substances = catalog.Substances;
        var manufacturers = catalog.Manufacturers;

        db.DrugCatalog.InsertBulk(substances);
        db.Manufacturers.InsertBulk(manufacturers);

        db.Metadata.Upsert("seed_version", new LiteDB.BsonDocument
        {
            ["_id"] = "seed_version",
            ["version"] = CurrentVersion,
            ["seededAt"] = DateTime.UtcNow.ToString("O")
        });

        logger.LogInformation("Seeded {SubstanceCount} substances and {ManufacturerCount} manufacturers",
            substances.Count, manufacturers.Count);
    }

    private DrugCatalogData LoadCatalogFromJson()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            var resourceName = "BloodTracker.Infrastructure.Data.drug-catalog.json";
            
            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null)
            {
                logger.LogWarning("Embedded drug catalog not found, trying file path");
                return LoadCatalogFromFile();
            }

            using var reader = new StreamReader(stream);
            var json = reader.ReadToEnd();
            
            var catalog = JsonSerializer.Deserialize<DrugCatalogData>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (catalog == null || catalog.Substances.Count == 0)
            {
                throw new InvalidOperationException("Drug catalog JSON is empty or invalid");
            }

            return catalog;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load drug catalog from embedded resource");
            throw;
        }
    }

    private DrugCatalogData LoadCatalogFromFile()
    {
        var filePath = Path.Combine(
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? ".",
            "Data",
            "drug-catalog.json");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Drug catalog file not found: {filePath}");
        }

        var json = File.ReadAllText(filePath);
        var catalog = JsonSerializer.Deserialize<DrugCatalogData>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (catalog == null || catalog.Substances.Count == 0)
        {
            throw new InvalidOperationException("Drug catalog JSON is empty or invalid");
        }

        return catalog;
    }

    private sealed class DrugCatalogData
    {
        public int Version { get; set; }
        public List<DrugCatalogItem> Substances { get; set; } = new();
        public List<Manufacturer> Manufacturers { get; set; } = new();
    }
}
