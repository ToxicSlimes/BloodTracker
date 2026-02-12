namespace BloodTracker.Domain.Models;

/// <summary>Метаданные каталога: популярность, сортировка, формы, PubMed</summary>
public sealed record CatalogMeta
{
    /// <summary>Отображать в секции «Популярные»</summary>
    public bool IsPopular { get; init; }

    /// <summary>Порядок сортировки в каталоге</summary>
    public int SortOrder { get; init; }

    /// <summary>Препарат доступен и в инъекционной, и в оральной форме</summary>
    public bool HasBothForms { get; init; }

    /// <summary>Поисковый запрос для PubMed</summary>
    public string? PubMedSearchTerm { get; init; }
}
