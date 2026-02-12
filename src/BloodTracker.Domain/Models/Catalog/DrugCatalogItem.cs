namespace BloodTracker.Domain.Models;

/// <summary>Элемент каталога препаратов (хранится в catalog.db)</summary>
public sealed class DrugCatalogItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? NameEn { get; init; }
    public DrugCategory Category { get; init; }
    public DrugSubcategory Subcategory { get; init; }
    public DrugType DrugType { get; init; }
    public string? ActiveSubstance { get; init; }

    /// <summary>Фармакология: полураспад, дозировки, рейтинги</summary>
    public PharmacologyInfo Pharmacology { get; init; } = new();

    /// <summary>Описание: текст, эффекты, побочки, заметки</summary>
    public SubstanceDescription Description { get; init; } = new();

    /// <summary>Мета: популярность, сортировка, формы, PubMed</summary>
    public CatalogMeta Meta { get; init; } = new();
}
