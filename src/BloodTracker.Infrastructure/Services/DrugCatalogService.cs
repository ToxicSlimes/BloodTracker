using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;

namespace BloodTracker.Infrastructure.Services;

public sealed class DrugCatalogService(CatalogDbContext db) : IDrugCatalogService
{
    public List<DrugCatalogItem> GetAll()
        => db.DrugCatalog.FindAll().OrderBy(x => x.Meta.SortOrder).ToList();

    public List<DrugCatalogItem> Search(string? query, DrugCategory? category, DrugSubcategory? subcategory, DrugType? drugType)
    {
        var items = db.DrugCatalog.FindAll().AsEnumerable();

        if (category.HasValue)
            items = items.Where(x => x.Category == category.Value);

        if (subcategory.HasValue)
            items = items.Where(x => x.Subcategory == subcategory.Value);

        if (drugType.HasValue)
            items = items.Where(x => x.DrugType == drugType.Value || x.Meta.HasBothForms);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.ToLowerInvariant();
            items = items.Where(x =>
                x.Name.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                (x.NameEn != null && x.NameEn.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                (x.ActiveSubstance != null && x.ActiveSubstance.Contains(q, StringComparison.OrdinalIgnoreCase)));
        }

        return items.OrderBy(x => x.Meta.SortOrder).ToList();
    }

    public DrugCatalogItem? GetById(string id)
        => db.DrugCatalog.FindById(id);

    public List<DrugCatalogItem> GetPopular()
        => db.DrugCatalog.Find(x => x.Meta.IsPopular).OrderBy(x => x.Meta.SortOrder).ToList();

    public List<Manufacturer> GetAllManufacturers()
        => db.Manufacturers.FindAll().OrderBy(x => x.SortOrder).ToList();

    public List<Manufacturer> SearchManufacturers(string? query, ManufacturerType? type)
    {
        var items = db.Manufacturers.FindAll().AsEnumerable();

        if (type.HasValue)
            items = items.Where(x => x.Type == type.Value);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.ToLowerInvariant();
            items = items.Where(x =>
                x.Name.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                (x.Country != null && x.Country.Contains(q, StringComparison.OrdinalIgnoreCase)));
        }

        return items.OrderBy(x => x.SortOrder).ToList();
    }

    public Manufacturer? GetManufacturerById(string id)
        => db.Manufacturers.FindById(id);
}
