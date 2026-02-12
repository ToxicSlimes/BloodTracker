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

    /// <summary>Расширенные научные данные (механизм, исследования, маркеры, взаимодействия)</summary>
    public ResearchData? Research { get; init; }
}

/// <summary>Научные данные по субстанции</summary>
public sealed record ResearchData
{
    /// <summary>Механизм действия на молекулярном уровне</summary>
    public string? Mechanism { get; init; }

    /// <summary>Ключевые клинические исследования</summary>
    public List<StudyReference> Studies { get; init; } = [];

    /// <summary>Маркеры крови для мониторинга</summary>
    public List<BloodworkMarker> Bloodwork { get; init; } = [];

    /// <summary>Лекарственные взаимодействия</summary>
    public List<DrugInteraction> Interactions { get; init; } = [];

    /// <summary>Противопоказания</summary>
    public ContraindicationsInfo? Contraindications { get; init; }

    /// <summary>Практические заметки (стекинг, ПКТ, длительность цикла)</summary>
    public string? PracticalNotes { get; init; }
}

/// <summary>Ссылка на клиническое исследование</summary>
public sealed record StudyReference
{
    /// <summary>Автор(ы) и год, e.g. "Bhasin et al., 1996"</summary>
    public required string Citation { get; init; }

    /// <summary>PubMed ID (если известен)</summary>
    public int? Pmid { get; init; }

    /// <summary>Дизайн исследования: RCT, meta-analysis, review и т.д.</summary>
    public string? Design { get; init; }

    /// <summary>Ключевой результат</summary>
    public required string Finding { get; init; }
}

/// <summary>Маркер крови для мониторинга</summary>
public sealed record BloodworkMarker
{
    /// <summary>Название маркера, e.g. "Гематокрит"</summary>
    public required string Name { get; init; }

    /// <summary>Частота проверки, e.g. "каждые 3 месяца"</summary>
    public string? Frequency { get; init; }

    /// <summary>Почему важен, e.g. ">54% — риск тромбоза"</summary>
    public string? Why { get; init; }
}

/// <summary>Лекарственное взаимодействие</summary>
public sealed record DrugInteraction
{
    /// <summary>С чем взаимодействует</summary>
    public required string Drug { get; init; }

    /// <summary>Результат взаимодействия</summary>
    public required string Effect { get; init; }

    /// <summary>Степень опасности: info, warning, danger</summary>
    public string Severity { get; init; } = "info";
}

/// <summary>Противопоказания</summary>
public sealed record ContraindicationsInfo
{
    /// <summary>Абсолютные — никогда</summary>
    public List<string> Absolute { get; init; } = [];

    /// <summary>Относительные — с осторожностью</summary>
    public List<string> Relative { get; init; } = [];
}
