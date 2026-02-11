using BloodTracker.Domain.Models;
using LiteDB;
using Microsoft.Extensions.Options;

namespace BloodTracker.Infrastructure.Persistence;

public sealed class CatalogDbContext : IDisposable
{
    private readonly LiteDatabase _database;

    public CatalogDbContext(IOptions<DatabaseSettings> settings)
    {
        var connStr = settings.Value.ConnectionString;
        var dir = Path.GetDirectoryName(connStr.Replace("Filename=", "").Split(';')[0]) ?? ".";
        _database = new LiteDatabase($"Filename={Path.Combine(dir, "catalog.db")};Connection=shared");

        DrugCatalog.EnsureIndex(x => x.Id, unique: true);
        DrugCatalog.EnsureIndex(x => x.Category);
        DrugCatalog.EnsureIndex(x => x.Name);
        DrugCatalog.EnsureIndex(x => x.IsPopular);

        Manufacturers.EnsureIndex(x => x.Id, unique: true);
        Manufacturers.EnsureIndex(x => x.Name);
        Manufacturers.EnsureIndex(x => x.Type);
    }

    public ILiteCollection<DrugCatalogItem> DrugCatalog => _database.GetCollection<DrugCatalogItem>("drug_catalog");
    public ILiteCollection<Manufacturer> Manufacturers => _database.GetCollection<Manufacturer>("manufacturers");
    public ILiteCollection<BsonDocument> Metadata => _database.GetCollection<BsonDocument>("_metadata");

    public void Dispose() => _database.Dispose();
}
