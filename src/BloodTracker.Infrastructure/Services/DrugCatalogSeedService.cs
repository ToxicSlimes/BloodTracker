using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

public sealed class DrugCatalogSeedService(CatalogDbContext db, ILogger<DrugCatalogSeedService> logger)
{
    private const int CurrentVersion = 3;

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

        var substances = GetSubstances();
        var manufacturers = GetManufacturers();

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

    private static List<DrugCatalogItem> GetSubstances()
    {
        var items = new List<DrugCatalogItem>();
        int order = 0;

        // ═══════════════════════════════════════════════════════════════
        // AAS INJECTABLE — Testosterone
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-enanthate", Name = "Тестостерон Энантат", NameEn = "Testosterone Enanthate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Testosterone Enanthate",
            Description = "Базовый эфир тестостерона с длительным периодом полураспада. Наиболее популярный эфир для ЗГТ и курсов.",
            Effects = "Набор мышечной массы, увеличение силы, повышение либидо, улучшение настроения и мотивации",
            SideEffects = "Ароматизация, задержка воды, акне, подавление ГПНГ, повышение гематокрита",
            HalfLife = "4.5-5 дней", DetectionTime = "3 месяца",
            CommonDosages = "250-500 мг/нед (курс), 100-200 мг/нед (ЗГТ)",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "testosterone+enanthate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-cypionate", Name = "Тестостерон Ципионат", NameEn = "Testosterone Cypionate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Testosterone Cypionate",
            Description = "Длинный эфир тестостерона, популярный в США для ЗГТ. Практически идентичен энантату.",
            Effects = "Набор мышечной массы, увеличение силы, улучшение самочувствия",
            SideEffects = "Ароматизация, задержка воды, акне, подавление ГПНГ",
            HalfLife = "5-6 дней", DetectionTime = "3 месяца",
            CommonDosages = "200-500 мг/нед",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "testosterone+cypionate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-propionate", Name = "Тестостерон Пропионат", NameEn = "Testosterone Propionate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Testosterone Propionate",
            Description = "Короткий эфир тестостерона. Быстрое начало действия, требует частых инъекций.",
            Effects = "Быстрый набор массы, меньше задержка воды чем у длинных эфиров",
            SideEffects = "Болезненные инъекции, ароматизация, акне",
            HalfLife = "0.8-1 день", DetectionTime = "2 недели",
            CommonDosages = "100 мг через день или 50 мг ежедневно",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "testosterone+propionate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-suspension", Name = "Тестостерон Суспензия", NameEn = "Testosterone Suspension",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Testosterone (водная суспензия)",
            Description = "Чистый тестостерон без эфира в водной суспензии. Мгновенное действие.",
            Effects = "Мгновенный пик тестостерона, максимальная сила перед тренировкой",
            SideEffects = "Очень болезненные инъекции, быстрая ароматизация",
            HalfLife = "2-4 часа", DetectionTime = "1-2 дня",
            CommonDosages = "25-50 мг перед тренировкой",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "testosterone+suspension",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-undecanoate", Name = "Тестостерон Ундеканоат", NameEn = "Testosterone Undecanoate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Testosterone Undecanoate",
            Description = "Сверхдлинный эфир тестостерона (Небидо). Одна инъекция на 10-14 недель.",
            Effects = "Стабильный уровень тестостерона, удобство применения",
            SideEffects = "Ароматизация, болезненная инъекция большого объёма (4 мл)",
            HalfLife = "20-21 день", DetectionTime = "5+ месяцев",
            CommonDosages = "1000 мг каждые 10-14 недель (ЗГТ)",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "testosterone+undecanoate",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "sustanon", Name = "Сустанон 250", NameEn = "Sustanon 250",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Testosterone blend (Propionate 30mg, Phenylpropionate 60mg, Isocaproate 60mg, Decanoate 100mg)",
            Description = "Смесь из 4 эфиров тестостерона. Комбинирует быстрое начало и длительное действие.",
            Effects = "Набор массы, увеличение силы, стабильный уровень тестостерона",
            SideEffects = "Ароматизация, задержка воды, нестабильный уровень гормонов",
            HalfLife = "7-8 дней (средний)", DetectionTime = "3+ месяца",
            CommonDosages = "250-500 мг/нед",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "sustanon+250+testosterone",
            IsPopular = true, SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // AAS INJECTABLE — Nandrolone
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "nandrolone-decanoate", Name = "Нандролон Деканоат", NameEn = "Nandrolone Decanoate (Deca)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Nandrolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Nandrolone Decanoate",
            Description = "Классический массонаборный стероид. Лечит суставы, отличный анаболик.",
            Effects = "Качественный набор массы, смазка суставов, повышение коллагена",
            SideEffects = "Прогестиновая активность, Deca Dick, подавление ГПНГ (длительное)",
            HalfLife = "6-12 дней", DetectionTime = "17-18 месяцев",
            CommonDosages = "200-400 мг/нед",
            AnabolicRating = 125, AndrogenicRating = 37, PubMedSearchTerm = "nandrolone+decanoate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "nandrolone-phenylpropionate", Name = "Нандролон Фенилпропионат", NameEn = "Nandrolone Phenylpropionate (NPP)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Nandrolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Nandrolone Phenylpropionate",
            Description = "Короткий эфир нандролона. Быстрее выводится, легче контролировать побочки.",
            Effects = "Набор массы, лечение суставов, быстрый контроль",
            SideEffects = "Прогестиновая активность, требует частых инъекций",
            HalfLife = "2.5-3 дня", DetectionTime = "11-12 месяцев",
            CommonDosages = "100 мг через день",
            AnabolicRating = 125, AndrogenicRating = 37, PubMedSearchTerm = "nandrolone+phenylpropionate",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // AAS INJECTABLE — Trenbolone
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "trenbolone-acetate", Name = "Тренболон Ацетат", NameEn = "Trenbolone Acetate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Trenbolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Trenbolone Acetate",
            Description = "Мощнейший анаболический стероид. 5x анаболическая активность тестостерона.",
            Effects = "Экстремальный набор сухой массы, жиросжигание, васкулярность, сила",
            SideEffects = "Бессонница, ночные поты, тренкашель, агрессия, кардиотоксичность",
            HalfLife = "1-2 дня", DetectionTime = "4-5 месяцев",
            CommonDosages = "50-100 мг через день",
            AnabolicRating = 500, AndrogenicRating = 500, PubMedSearchTerm = "trenbolone+acetate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "trenbolone-enanthate", Name = "Тренболон Энантат", NameEn = "Trenbolone Enanthate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Trenbolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Trenbolone Enanthate",
            Description = "Длинный эфир тренболона. Реже инъекции, но сложнее контролировать побочки.",
            Effects = "Набор сухой массы, жиросжигание, сила",
            SideEffects = "Бессонница, ночные поты, кардиотоксичность, долго выводится",
            HalfLife = "5-7 дней", DetectionTime = "5+ месяцев",
            CommonDosages = "200-400 мг/нед",
            AnabolicRating = 500, AndrogenicRating = 500, PubMedSearchTerm = "trenbolone+enanthate",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "trenbolone-hexahydrobenzylcarbonate", Name = "Тренболон Гексагидробензилкарбонат", NameEn = "Trenbolone Hex (Parabolan)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Trenbolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Trenbolone Hexahydrobenzylcarbonate",
            Description = "Оригинальная фармацевтическая форма тренболона (Параболан).",
            Effects = "Набор сухой массы, жиросжигание",
            SideEffects = "Аналогичны другим эфирам тренболона",
            HalfLife = "6-8 дней", DetectionTime = "5+ месяцев",
            CommonDosages = "150-300 мг/нед",
            AnabolicRating = 500, AndrogenicRating = 500, PubMedSearchTerm = "trenbolone+hexahydrobenzylcarbonate",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // AAS INJECTABLE — Boldenone
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "boldenone-undecylenate", Name = "Болденон", NameEn = "Boldenone Undecylenate (Equipoise)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Boldenone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Boldenone Undecylenate",
            Description = "Мягкий инъекционный стероид с длительным действием. Повышает аппетит и эритропоэз.",
            Effects = "Качественная сухая масса, повышение аппетита, выносливость, васкулярность",
            SideEffects = "Повышение гематокрита, тревожность у некоторых, длительное обнаружение",
            HalfLife = "14 дней", DetectionTime = "5+ месяцев",
            CommonDosages = "300-600 мг/нед",
            AnabolicRating = 100, AndrogenicRating = 50, PubMedSearchTerm = "boldenone+undecylenate",
            IsPopular = true, SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // AAS INJECTABLE — Drostanolone
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "drostanolone-propionate", Name = "Мастерон Пропионат", NameEn = "Drostanolone Propionate (Masteron)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Drostanolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Drostanolone Propionate",
            Description = "Анти-эстрогенный стероид. Придаёт жёсткость и рельефность мускулатуре.",
            Effects = "Жёсткость мышц, анти-эстрогенный эффект, сила без массы",
            SideEffects = "Выпадение волос (сильно), акне, подавление ГПНГ",
            HalfLife = "1-2 дня", DetectionTime = "2 недели",
            CommonDosages = "100 мг через день",
            AnabolicRating = 62, AndrogenicRating = 25, PubMedSearchTerm = "drostanolone+propionate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "drostanolone-enanthate", Name = "Мастерон Энантат", NameEn = "Drostanolone Enanthate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Drostanolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Drostanolone Enanthate",
            Description = "Длинный эфир мастерона. Реже инъекции.",
            Effects = "Жёсткость мышц, анти-эстрогенный эффект",
            SideEffects = "Выпадение волос, акне",
            HalfLife = "5-6 дней", DetectionTime = "3 месяца",
            CommonDosages = "200-400 мг/нед",
            AnabolicRating = 62, AndrogenicRating = 25, PubMedSearchTerm = "drostanolone+enanthate",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // AAS INJECTABLE — Methenolone
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "methenolone-enanthate", Name = "Примоболан Депо", NameEn = "Methenolone Enanthate (Primobolan Depot)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Methenolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Methenolone Enanthate",
            Description = "Мягкий анаболический стероид, не ароматизируется. Любимый препарат Арнольда.",
            Effects = "Сохранение мышц на сушке, качественная масса без воды, минимум побочек",
            SideEffects = "Выпадение волос, слабое подавление ГПНГ",
            HalfLife = "5-7 дней", DetectionTime = "4-5 месяцев",
            CommonDosages = "400-800 мг/нед",
            AnabolicRating = 88, AndrogenicRating = 44, PubMedSearchTerm = "methenolone+enanthate",
            IsPopular = true, SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // AAS ORAL
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "methandrostenolone", Name = "Метандростенолон", NameEn = "Methandrostenolone (Dianabol)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "Methandrostenolone",
            Description = "Классический оральный стероид. Быстрый набор массы и силы.",
            Effects = "Быстрый набор массы (до 10 кг за 6 недель), огромное увеличение силы",
            SideEffects = "Гепатотоксичность, задержка воды, ароматизация, акне",
            HalfLife = "3-6 часов", DetectionTime = "5-6 недель",
            CommonDosages = "20-50 мг/день, 4-6 недель",
            AnabolicRating = 210, AndrogenicRating = 60, PubMedSearchTerm = "methandienone+OR+methandrostenolone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "stanozolol", Name = "Станозолол", NameEn = "Stanozolol (Winstrol)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            HasBothForms = true, ActiveSubstance = "Stanozolol",
            Description = "Сушильный стероид. Доступен в оральной и инъекционной форме.",
            Effects = "Жёсткость мышц, сила, васкулярность, жиросжигание",
            SideEffects = "Гепатотоксичность, боль в суставах (сушит связки), выпадение волос",
            HalfLife = "9 часов (орал) / 24 часа (инъекция)", DetectionTime = "2 месяца",
            CommonDosages = "30-50 мг/день (орал), 50 мг через день (инъекция)",
            AnabolicRating = 320, AndrogenicRating = 30, PubMedSearchTerm = "stanozolol",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "oxandrolone", Name = "Оксандролон", NameEn = "Oxandrolone (Anavar)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "Oxandrolone",
            Description = "Мягкий оральный стероид. Минимальная гепатотоксичность, не ароматизируется.",
            Effects = "Сила, жиросжигание, мышечная жёсткость",
            SideEffects = "Снижение ЛПВП, подавление ГПНГ, дороговизна",
            HalfLife = "9-10 часов", DetectionTime = "3 недели",
            CommonDosages = "20-80 мг/день, 6-8 недель",
            AnabolicRating = 322, AndrogenicRating = 24, PubMedSearchTerm = "oxandrolone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "oxymetholone", Name = "Оксиметолон", NameEn = "Oxymetholone (Anadrol)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "Oxymetholone",
            Description = "Самый мощный оральный стероид. Огромный и быстрый набор массы.",
            Effects = "Экстремальный набор массы (до 15 кг), колоссальная сила, пампинг",
            SideEffects = "Высокая гепатотоксичность, задержка воды, головные боли, повышение давления",
            HalfLife = "8-9 часов", DetectionTime = "2 месяца",
            CommonDosages = "50-100 мг/день, 4-6 недель",
            AnabolicRating = 320, AndrogenicRating = 45, PubMedSearchTerm = "oxymetholone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "turinabol", Name = "Туринабол", NameEn = "4-Chlorodehydromethyltestosterone (Turinabol)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "4-Chlorodehydromethyltestosterone",
            Description = "Мягкий оральный стероид. Качественная масса без задержки воды.",
            Effects = "Качественная сухая масса, сила, выносливость",
            SideEffects = "Гепатотоксичность (умеренная), подавление ГПНГ",
            HalfLife = "16 часов", DetectionTime = "11-12 месяцев",
            CommonDosages = "40-60 мг/день, 6-8 недель",
            AnabolicRating = 54, AndrogenicRating = 6, PubMedSearchTerm = "chlorodehydromethyltestosterone+OR+turinabol",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "fluoxymesterone", Name = "Флуоксиместерон", NameEn = "Fluoxymesterone (Halotestin)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "Fluoxymesterone",
            Description = "Мощнейший андроген. Только для силы, без набора массы.",
            Effects = "Экстремальная сила и агрессия, жёсткость мышц",
            SideEffects = "Очень высокая гепатотоксичность, агрессия, выпадение волос",
            HalfLife = "6-8 часов", DetectionTime = "2 месяца",
            CommonDosages = "10-20 мг/день, не более 4 недель",
            AnabolicRating = 1900, AndrogenicRating = 850, PubMedSearchTerm = "fluoxymesterone",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "methenolone-acetate", Name = "Примоболан (орал)", NameEn = "Methenolone Acetate (Primobolan Oral)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Methenolone, DrugType = DrugType.Oral,
            ActiveSubstance = "Methenolone Acetate",
            Description = "Оральная форма примоболана. Очень мягкий, низкая биодоступность.",
            Effects = "Мягкий анаболический эффект, сохранение мышц",
            SideEffects = "Низкая эффективность из-за биодоступности, дорогой",
            HalfLife = "4-6 часов", DetectionTime = "4-5 недель",
            CommonDosages = "50-100 мг/день",
            AnabolicRating = 88, AndrogenicRating = 44, PubMedSearchTerm = "methenolone+acetate",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // PEPTIDES — GHRP
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "ghrp-2", Name = "GHRP-2", NameEn = "GHRP-2 (Growth Hormone Releasing Peptide-2)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.GHRP, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "GHRP-2",
            Description = "Пептид, стимулирующий выброс гормона роста. Самый мощный из GHRP семейства.",
            Effects = "Повышение ГР, улучшение сна, жиросжигание, аппетит",
            SideEffects = "Повышение кортизола и пролактина, сильное повышение аппетита",
            HalfLife = "15-30 минут",
            CommonDosages = "100-300 мкг 2-3 раза/день",
            PubMedSearchTerm = "GHRP-2+growth+hormone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "ghrp-6", Name = "GHRP-6", NameEn = "GHRP-6 (Growth Hormone Releasing Peptide-6)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.GHRP, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "GHRP-6",
            Description = "Пептид для стимуляции ГР. Сильнее повышает аппетит чем GHRP-2.",
            Effects = "Повышение ГР, мощное повышение аппетита, жиросжигание",
            SideEffects = "Сильный голод, повышение кортизола",
            HalfLife = "15-30 минут",
            CommonDosages = "100-300 мкг 2-3 раза/день",
            PubMedSearchTerm = "GHRP-6+growth+hormone",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "ipamorelin", Name = "Ипаморелин", NameEn = "Ipamorelin",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.GHRP, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Ipamorelin",
            Description = "Селективный стимулятор ГР. Не повышает кортизол и пролактин.",
            Effects = "Мягкое повышение ГР, жиросжигание, улучшение сна",
            SideEffects = "Минимальные, возможна головная боль",
            HalfLife = "2 часа",
            CommonDosages = "200-300 мкг 2-3 раза/день",
            PubMedSearchTerm = "ipamorelin",
            IsPopular = true, SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // PEPTIDES — GHRH
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "cjc-1295-dac", Name = "CJC-1295 DAC", NameEn = "CJC-1295 with DAC",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.GHRH, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "CJC-1295 (с DAC линкером)",
            Description = "Длительно действующий аналог ГРРГ. Поднимает базовый уровень ГР.",
            Effects = "Постоянное повышение ГР, жиросжигание, улучшение сна",
            SideEffects = "Задержка воды, онемение конечностей",
            HalfLife = "6-8 дней",
            CommonDosages = "1-2 мг/нед",
            PubMedSearchTerm = "CJC-1295+DAC",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "cjc-1295-no-dac", Name = "CJC-1295 (Mod GRF 1-29)", NameEn = "CJC-1295 without DAC (Mod GRF)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.GHRH, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Modified GRF (1-29)",
            Description = "Короткоживущий аналог ГРРГ. Используется в комбинации с GHRP.",
            Effects = "Синергия с GHRP для максимального выброса ГР",
            SideEffects = "Покраснение лица, головокружение",
            HalfLife = "30 минут",
            CommonDosages = "100-200 мкг 2-3 раза/день (с GHRP)",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // PEPTIDES — Healing
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "bpc-157", Name = "BPC-157", NameEn = "BPC-157 (Body Protection Compound)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.HealingPeptide, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "BPC-157",
            Description = "Пептид для заживления тканей. Ускоряет восстановление связок, сухожилий, ЖКТ.",
            Effects = "Заживление травм, восстановление ЖКТ, противовоспалительный эффект",
            SideEffects = "Минимальные, возможна тошнота",
            HalfLife = "~4 часа",
            CommonDosages = "250-500 мкг 2 раза/день, 4-8 недель",
            PubMedSearchTerm = "BPC-157",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "tb-500", Name = "TB-500", NameEn = "TB-500 (Thymosin Beta-4)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.HealingPeptide, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Thymosin Beta-4 (фрагмент)",
            Description = "Пептид для регенерации тканей. Системное действие на весь организм.",
            Effects = "Заживление мышц, связок и сухожилий, противовоспалительный эффект",
            SideEffects = "Вялость, головная боль (редко)",
            HalfLife = "~2 часа",
            CommonDosages = "2-5 мг 2 раза/нед, 4-6 недель",
            PubMedSearchTerm = "thymosin+beta-4",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "ghk-cu", Name = "GHK-Cu", NameEn = "GHK-Cu (Copper Peptide)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.HealingPeptide, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "GHK-Cu (медный пептид)",
            Description = "Медьсодержащий пептид. Стимулирует синтез коллагена и заживление кожи.",
            Effects = "Омоложение кожи, заживление ран, противовоспалительный эффект",
            SideEffects = "Покраснение в месте инъекции",
            CommonDosages = "1-2 мг/день подкожно или местно",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // PEPTIDES — Melanotropin
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "melanotan-ii", Name = "Меланотан II", NameEn = "Melanotan II",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.Melanotropin, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Melanotan II",
            Description = "Синтетический аналог MSH. Загар без солнца, повышение либидо.",
            Effects = "Пигментация кожи (загар), повышение либидо, снижение аппетита",
            SideEffects = "Тошнота, покраснение лица, появление новых родинок",
            HalfLife = "~1 час",
            CommonDosages = "Загрузка: 250-500 мкг/день, поддержка: 500 мкг/нед",
            PubMedSearchTerm = "melanotan+II",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "hgh-fragment-176-191", Name = "HGH Fragment 176-191", NameEn = "HGH Fragment 176-191",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "HGH Fragment 176-191",
            Description = "Жиросжигающий фрагмент гормона роста. Только липолитический эффект без роста.",
            Effects = "Жиросжигание, без влияния на уровень сахара",
            SideEffects = "Минимальные",
            HalfLife = "15-30 минут",
            CommonDosages = "250-500 мкг 2 раза/день натощак",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // GROWTH HORMONE
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "genotropin", Name = "Генотропин", NameEn = "Genotropin (Pfizer)",
            Category = DrugCategory.GrowthHormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Somatropin (рекомбинантный ГР)",
            Description = "Фармацевтический гормон роста от Pfizer. Золотой стандарт качества.",
            Effects = "Жиросжигание, рост мышц, омоложение, заживление, улучшение сна",
            SideEffects = "Задержка воды, тоннельный синдром, повышение сахара, боль в суставах",
            HalfLife = "2-3 часа",
            CommonDosages = "2-4 МЕ/день (антиэйдж), 6-10 МЕ/день (бодибилдинг)",
            PubMedSearchTerm = "somatropin+growth+hormone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "jintropin", Name = "Джинтропин", NameEn = "Jintropin (GeneScience)",
            Category = DrugCategory.GrowthHormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Somatropin (рекомбинантный ГР)",
            Description = "Китайский фармацевтический ГР. Хорошее соотношение цена/качество.",
            Effects = "Жиросжигание, рост мышц, омоложение",
            SideEffects = "Задержка воды, тоннельный синдром, повышение сахара",
            HalfLife = "2-3 часа",
            CommonDosages = "4-10 МЕ/день",
            PubMedSearchTerm = "somatropin+growth+hormone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "ansomone", Name = "Ансомон", NameEn = "Ansomone",
            Category = DrugCategory.GrowthHormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Somatropin",
            Description = "Китайский фармацевтический ГР. Бюджетный вариант.",
            Effects = "Жиросжигание, рост мышц", SideEffects = "Задержка воды, тоннельный синдром",
            HalfLife = "2-3 часа", CommonDosages = "4-10 МЕ/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "norditropin", Name = "Нордитропин", NameEn = "Norditropin (Novo Nordisk)",
            Category = DrugCategory.GrowthHormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Somatropin",
            Description = "Фармацевтический ГР от Novo Nordisk в удобной шприц-ручке.",
            Effects = "Жиросжигание, рост мышц, омоложение",
            SideEffects = "Задержка воды, тоннельный синдром",
            HalfLife = "2-3 часа", CommonDosages = "2-10 МЕ/день",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "humatrope", Name = "Хуматроп", NameEn = "Humatrope (Eli Lilly)",
            Category = DrugCategory.GrowthHormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Somatropin",
            Description = "Фармацевтический ГР от Eli Lilly.",
            Effects = "Жиросжигание, рост мышц, омоложение",
            SideEffects = "Задержка воды, тоннельный синдром",
            HalfLife = "2-3 часа", CommonDosages = "2-10 МЕ/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "somatrogon", Name = "Нгенла (Соматрогон)", NameEn = "Ngenla (Somatrogon)",
            Category = DrugCategory.GrowthHormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Somatrogon",
            Description = "ГР длительного действия, одна инъекция в неделю.",
            Effects = "Поддержание стабильного уровня ГР, жиросжигание",
            SideEffects = "Головная боль, боли в суставах",
            HalfLife = "~28 часов", CommonDosages = "Индивидуально, 1 раз/нед",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // SARMs
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "ostarine", Name = "Остарин (MK-2866)", NameEn = "Ostarine (MK-2866)",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Ostarine (Enobosarm)",
            Description = "Самый изученный SARM. Мягкий, хорош для сохранения мышц на дефиците.",
            Effects = "Сохранение мышц на сушке, лёгкий набор, укрепление суставов",
            SideEffects = "Подавление ГПНГ (дозозависимое), снижение ЛПВП",
            HalfLife = "24 часа",
            CommonDosages = "10-25 мг/день, 8-12 недель",
            PubMedSearchTerm = "ostarine+enobosarm",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "ligandrol", Name = "Лигандрол (LGD-4033)", NameEn = "Ligandrol (LGD-4033)",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Ligandrol",
            Description = "Мощный SARM для набора массы. Сильнее Остарина.",
            Effects = "Набор сухой массы, увеличение силы",
            SideEffects = "Подавление ГПНГ, задержка воды",
            HalfLife = "24-36 часов",
            CommonDosages = "5-10 мг/день, 8-12 недель",
            PubMedSearchTerm = "ligandrol+LGD-4033",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "rad140", Name = "RAD-140 (Тестолон)", NameEn = "RAD-140 (Testolone)",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "RAD-140",
            Description = "Самый мощный SARM. Близок по силе к слабым стероидам.",
            Effects = "Набор сухой массы, сила, жиросжигание",
            SideEffects = "Подавление ГПНГ (значительное), гепатотоксичность (умеренная)",
            HalfLife = "60 часов",
            CommonDosages = "10-20 мг/день, 8-12 недель",
            PubMedSearchTerm = "RAD-140+testolone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "andarine", Name = "Андарин (S-4)", NameEn = "Andarine (S-4)",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Andarine",
            Description = "SARM для сушки. Может вызывать проблемы со зрением.",
            Effects = "Жиросжигание, жёсткость мышц, сила",
            SideEffects = "Жёлтый оттенок зрения ночью, подавление ГПНГ",
            HalfLife = "4-6 часов",
            CommonDosages = "25-50 мг/день (с перерывами 2 дня в неделю)",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "cardarine", Name = "Кардарин (GW501516)", NameEn = "Cardarine (GW501516)",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "GW501516",
            Description = "Не SARM, а PPARδ агонист. Мощнейший усилитель выносливости.",
            Effects = "Огромное увеличение выносливости, жиросжигание, улучшение липидов",
            SideEffects = "Потенциальный канцерогенный риск (по данным животных моделей)",
            HalfLife = "16-24 часа",
            CommonDosages = "10-20 мг/день, 8-12 недель",
            PubMedSearchTerm = "GW501516+cardarine",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "sr9009", Name = "SR9009 (Стенаболик)", NameEn = "SR9009 (Stenabolic)",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "SR9009",
            Description = "Агонист Rev-Erb. Улучшает метаболизм и выносливость. Низкая биодоступность орально.",
            Effects = "Повышение метаболизма, выносливость, жиросжигание",
            SideEffects = "Низкая биодоступность (лучше сублингвально), бессонница",
            HalfLife = "4-6 часов",
            CommonDosages = "20-30 мг/день (разделить на 3 приёма)",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "yk-11", Name = "YK-11", NameEn = "YK-11",
            Category = DrugCategory.SARM, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "YK-11",
            Description = "Ингибитор миостатина, SARM/стероид гибрид. Мало изучен.",
            Effects = "Набор массы через ингибирование миостатина, увеличение фоллистатина",
            SideEffects = "Гепатотоксичность, подавление ГПНГ, мало данных о безопасности",
            HalfLife = "6-10 часов",
            CommonDosages = "5-10 мг/день",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // ANTI-ESTROGENS (Aromatase Inhibitors)
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "anastrozole", Name = "Анастрозол", NameEn = "Anastrozole (Arimidex)",
            Category = DrugCategory.AntiEstrogen, Subcategory = DrugSubcategory.AromataseInhibitor, DrugType = DrugType.Oral,
            ActiveSubstance = "Anastrozole",
            Description = "Нестероидный ингибитор ароматазы. Основной AI на курсе.",
            Effects = "Снижение эстрадиола, профилактика гинекомастии",
            SideEffects = "Боль в суставах, ухудшение липидов, снижение либидо при передозировке",
            HalfLife = "46 часов",
            CommonDosages = "0.25-0.5 мг через день (на курсе)",
            PubMedSearchTerm = "anastrozole",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "letrozole", Name = "Летрозол", NameEn = "Letrozole (Femara)",
            Category = DrugCategory.AntiEstrogen, Subcategory = DrugSubcategory.AromataseInhibitor, DrugType = DrugType.Oral,
            ActiveSubstance = "Letrozole",
            Description = "Самый мощный ингибитор ароматазы. Практически полностью подавляет эстрадиол.",
            Effects = "Мощное снижение эстрадиола, обратить гинекомастию на ранних стадиях",
            SideEffects = "Боль в суставах, сильная сухость, ухудшение липидов",
            HalfLife = "2-4 дня",
            CommonDosages = "0.25-0.5 мг через 2-3 дня (на курсе), 2.5 мг/день (гино-протокол)",
            PubMedSearchTerm = "letrozole",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "exemestane", Name = "Эксеместан", NameEn = "Exemestane (Aromasin)",
            Category = DrugCategory.AntiEstrogen, Subcategory = DrugSubcategory.AromataseInhibitor, DrugType = DrugType.Oral,
            ActiveSubstance = "Exemestane",
            Description = "Стероидный (суицидный) ингибитор ароматазы. Необратимо связывается с ферментом.",
            Effects = "Снижение эстрадиола, небольшое повышение тестостерона",
            SideEffects = "Боль в суставах, усталость, потеря волос",
            HalfLife = "24 часа",
            CommonDosages = "12.5-25 мг через день (на курсе)",
            PubMedSearchTerm = "exemestane",
            IsPopular = true, SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // PCT
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "clomiphene", Name = "Кломифен", NameEn = "Clomiphene Citrate (Clomid)",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.SERM, DrugType = DrugType.Oral,
            ActiveSubstance = "Clomiphene Citrate",
            Description = "SERM для ПКТ. Стимулирует выработку ЛГ/ФСГ.",
            Effects = "Восстановление ГПНГ, повышение ЛГ и ФСГ, стимуляция сперматогенеза",
            SideEffects = "Нарушение зрения (мутное зрение), перепады настроения, депрессия",
            HalfLife = "5-7 дней",
            CommonDosages = "ПКТ: 50/50/25/25 мг/день (4 недели)",
            PubMedSearchTerm = "clomiphene+citrate",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "tamoxifen", Name = "Тамоксифен", NameEn = "Tamoxifen (Nolvadex)",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.SERM, DrugType = DrugType.Oral,
            ActiveSubstance = "Tamoxifen Citrate",
            Description = "SERM для ПКТ и профилактики гинекомастии. Блокирует рецепторы эстрогена в груди.",
            Effects = "Восстановление ГПНГ, блокировка эстрогена в молочных железах",
            SideEffects = "Снижение IGF-1, повышение ГСПГ, эмоциональность",
            HalfLife = "5-7 дней",
            CommonDosages = "ПКТ: 40/40/20/20 мг/день (4 недели), гино: 20 мг/день",
            PubMedSearchTerm = "tamoxifen",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "hcg", Name = "Хорионический гонадотропин (ХГЧ)", NameEn = "HCG (Human Chorionic Gonadotropin)",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Human Chorionic Gonadotropin",
            Description = "Аналог ЛГ. Стимулирует выработку тестостерона яичками. Используется на курсе и в ПКТ.",
            Effects = "Поддержание размера яичек, стимуляция тестостерона, подготовка к ПКТ",
            SideEffects = "Ароматизация, десенситизация рецепторов при высоких дозах",
            HalfLife = "23-37 часов",
            CommonDosages = "На курсе: 250-500 МЕ 2 раза/нед, ПКТ: 1000-2000 МЕ через день (2 нед)",
            PubMedSearchTerm = "human+chorionic+gonadotropin",
            IsPopular = true, SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // FAT BURNERS
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "clenbuterol", Name = "Кленбутерол", NameEn = "Clenbuterol",
            Category = DrugCategory.FatBurner, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Clenbuterol Hydrochloride",
            Description = "Бета-2 агонист. Мощный жиросжигатель и бронхолитик.",
            Effects = "Жиросжигание, повышение температуры тела, лёгкий антикатаболический эффект",
            SideEffects = "Тремор рук, тахикардия, судороги, бессонница, повышение давления",
            HalfLife = "35-40 часов",
            CommonDosages = "Пирамида: 20→120→20 мкг/день, 2 нед ON / 2 нед OFF",
            PubMedSearchTerm = "clenbuterol",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "t3-cytomel", Name = "Трийодтиронин (T3)", NameEn = "T3 (Cytomel / Liothyronine)",
            Category = DrugCategory.FatBurner, Subcategory = DrugSubcategory.Thyroid, DrugType = DrugType.Oral,
            ActiveSubstance = "Liothyronine (T3)",
            Description = "Гормон щитовидной железы. Разгоняет метаболизм для жиросжигания.",
            Effects = "Ускорение метаболизма, мощное жиросжигание",
            SideEffects = "Потеря мышц (без AAS), повышение ЧСС, подавление щитовидки",
            HalfLife = "2.5 дня",
            CommonDosages = "25-75 мкг/день (начинать с 25, плавно повышать)",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "t4-synthroid", Name = "Тироксин (T4)", NameEn = "T4 (Synthroid / Levothyroxine)",
            Category = DrugCategory.FatBurner, Subcategory = DrugSubcategory.Thyroid, DrugType = DrugType.Oral,
            ActiveSubstance = "Levothyroxine (T4)",
            Description = "Прогормон щитовидной железы. Конвертируется в T3 в организме. Мягче чем T3.",
            Effects = "Мягкое ускорение метаболизма, жиросжигание",
            SideEffects = "При передозировке: тахикардия, потливость, тремор",
            HalfLife = "6-7 дней",
            CommonDosages = "50-200 мкг/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "semaglutide", Name = "Семаглутид", NameEn = "Semaglutide (Ozempic / Wegovy)",
            Category = DrugCategory.FatBurner, Subcategory = DrugSubcategory.GLP1Agonist, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Semaglutide",
            Description = "GLP-1 агонист для контроля веса и диабета. Мощное подавление аппетита.",
            Effects = "Снижение аппетита, потеря веса, контроль сахара, кардиопротекция",
            SideEffects = "Тошнота, запор/диарея, панкреатит (редко)",
            HalfLife = "~7 дней",
            CommonDosages = "0.25→0.5→1.0→2.4 мг/нед (титрование каждые 4 нед)",
            PubMedSearchTerm = "semaglutide",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "tirzepatide", Name = "Тирзепатид", NameEn = "Tirzepatide (Mounjaro / Zepbound)",
            Category = DrugCategory.FatBurner, Subcategory = DrugSubcategory.GLP1Agonist, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Tirzepatide",
            Description = "Двойной GIP/GLP-1 агонист. Более мощный чем семаглутид для потери веса.",
            Effects = "Потеря веса до 20%, контроль сахара, снижение аппетита",
            SideEffects = "Тошнота, диарея, запор",
            HalfLife = "5 дней",
            CommonDosages = "2.5→5→7.5→10→12.5→15 мг/нед",
            PubMedSearchTerm = "tirzepatide",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "retatrutide", Name = "Ретатрутид", NameEn = "Retatrutide",
            Category = DrugCategory.FatBurner, Subcategory = DrugSubcategory.GLP1Agonist, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Retatrutide",
            Description = "Тройной GIP/GLP-1/глюкагон агонист. Экспериментальный, потеря веса до 24%.",
            Effects = "Максимальная потеря веса, контроль сахара",
            SideEffects = "Тошнота, диарея, повышение ЧСС",
            CommonDosages = "1→4→8→12 мг/нед (в разработке)",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // INSULIN
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "humalog", Name = "Хумалог", NameEn = "Humalog (Insulin Lispro)",
            Category = DrugCategory.Insulin, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Insulin Lispro",
            Description = "Быстрый инсулин. Используется в бодибилдинге для набора массы.",
            Effects = "Максимальный анаболический транспорт нутриентов, набор массы",
            SideEffects = "ГИПОГЛИКЕМИЯ (опасно для жизни!), набор жира",
            HalfLife = "1 час", DetectionTime = "Не определяется",
            CommonDosages = "5-15 МЕ перед/после тренировки (ТОЛЬКО с опытом)",
            Notes = "ВНИМАНИЕ: Инсулин может быть СМЕРТЕЛЬНО опасен при неправильном использовании!",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "novorapid", Name = "Новорапид", NameEn = "NovoRapid (Insulin Aspart)",
            Category = DrugCategory.Insulin, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Insulin Aspart",
            Description = "Быстрый аналог инсулина от Novo Nordisk.",
            Effects = "Анаболический транспорт нутриентов",
            SideEffects = "ГИПОГЛИКЕМИЯ (опасно!), набор жира",
            HalfLife = "1-1.5 часа",
            CommonDosages = "5-15 МЕ перед/после тренировки",
            Notes = "ВНИМАНИЕ: Опасен для жизни при неправильном использовании!",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "lantus", Name = "Лантус", NameEn = "Lantus (Insulin Glargine)",
            Category = DrugCategory.Insulin, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Insulin Glargine",
            Description = "Длительный инсулин (24 часа). Используется для стабильного анаболического фона.",
            Effects = "Постоянный анаболический фон, стабильный уровень глюкозы",
            SideEffects = "ГИПОГЛИКЕМИЯ, набор жира",
            HalfLife = "24 часа",
            CommonDosages = "10-30 МЕ/день утром",
            Notes = "ВНИМАНИЕ: Опасен для жизни!",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // DOPAMINE AGONISTS
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "cabergoline", Name = "Каберголин", NameEn = "Cabergoline (Dostinex)",
            Category = DrugCategory.DopamineAgonist, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Cabergoline",
            Description = "Агонист дофамина D2. Снижает пролактин. Необходим на курсах с нандролоном и тренболоном.",
            Effects = "Снижение пролактина, повышение либидо, улучшение оргазма",
            SideEffects = "Тошнота, головокружение, гипотония, компульсивное поведение (редко)",
            HalfLife = "63-69 часов",
            CommonDosages = "0.25-0.5 мг 2 раза/нед",
            PubMedSearchTerm = "cabergoline",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "bromocriptine", Name = "Бромокриптин", NameEn = "Bromocriptine (Parlodel)",
            Category = DrugCategory.DopamineAgonist, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Bromocriptine",
            Description = "Агонист дофамина. Старый препарат для снижения пролактина.",
            Effects = "Снижение пролактина, жиросжигание",
            SideEffects = "Тошнота (сильная), головокружение, заложенность носа",
            HalfLife = "12-14 часов",
            CommonDosages = "1.25-2.5 мг/день",
            SortOrder = order++
        });

        // ═══════════════════════════════════════════════════════════════
        // OTHER
        // ═══════════════════════════════════════════════════════════════
        items.Add(new DrugCatalogItem
        {
            Id = "dhea", Name = "ДГЭА", NameEn = "DHEA (Dehydroepiandrosterone)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "DHEA",
            Description = "Прогормон надпочечников. Конвертируется в тестостерон и эстрадиол.",
            Effects = "Мягкое повышение андрогенов, улучшение настроения, антиэйдж",
            SideEffects = "Акне, рост волос на теле, ароматизация",
            HalfLife = "12 часов",
            CommonDosages = "25-100 мг/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "meldonium", Name = "Мельдоний", NameEn = "Meldonium (Mildronate)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Meldonium",
            Description = "Кардиопротектор. Улучшает утилизацию кислорода клетками.",
            Effects = "Повышение выносливости, кардиопротекция, быстрое восстановление",
            SideEffects = "Минимальные, возможна диспепсия",
            HalfLife = "4-6 часов",
            CommonDosages = "500-1000 мг/день, курсами 4-6 недель",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "pregnenolone", Name = "Прегненолон", NameEn = "Pregnenolone",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Pregnenolone",
            Description = "Мастер-прогормон. Предшественник всех стероидных гормонов.",
            Effects = "Улучшение памяти, настроения, поддержка гормонального баланса",
            SideEffects = "Акне, раздражительность при высоких дозах",
            HalfLife = "1-2 часа",
            CommonDosages = "10-50 мг/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "proviron", Name = "Провирон", NameEn = "Proviron (Mesterolone)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "Mesterolone",
            Description = "Оральный андроген. Не анаболик. Снижает ГСПГ, повышает свободный тестостерон.",
            Effects = "Снижение ГСПГ, анти-эстрогенный эффект, повышение либидо, жёсткость мышц",
            SideEffects = "Выпадение волос, подавление ГПНГ (слабое)",
            HalfLife = "12 часов",
            CommonDosages = "25-50 мг/день",
            AnabolicRating = 150, AndrogenicRating = 30, PubMedSearchTerm = "mesterolone",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-undecanoate-oral", Name = "Тестостерон Ундеканоат (орал)", NameEn = "Testosterone Undecanoate Oral (Andriol)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Oral,
            ActiveSubstance = "Testosterone Undecanoate (oral)",
            Description = "Оральный тестостерон. Низкая биодоступность, требует приёма с жирной пищей.",
            Effects = "Мягкое повышение тестостерона",
            SideEffects = "Нестабильные уровни, необходимость приёма с пищей",
            HalfLife = "3-4 часа",
            CommonDosages = "120-240 мг/день (с жирной пищей)",
            AnabolicRating = 100, AndrogenicRating = 100, PubMedSearchTerm = "testosterone+undecanoate+oral",
            SortOrder = order++
        });

        // Additional compounds to reach 100+
        items.Add(new DrugCatalogItem
        {
            Id = "gonadorelin", Name = "Гонадорелин", NameEn = "Gonadorelin (GnRH)",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Gonadorelin",
            Description = "Аналог ГнРГ. Стимулирует выброс ЛГ/ФСГ из гипофиза.",
            Effects = "Восстановление ГПНГ, альтернатива ХГЧ на курсе",
            SideEffects = "Головная боль, покраснение в месте инъекции",
            HalfLife = "10-40 минут",
            CommonDosages = "100-200 мкг 2 раза/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "enclomiphene", Name = "Энкломифен", NameEn = "Enclomiphene",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.SERM, DrugType = DrugType.Oral,
            ActiveSubstance = "Enclomiphene Citrate",
            Description = "Чистый транс-изомер кломифена. Меньше побочек чем кломифен.",
            Effects = "Повышение ЛГ/ФСГ и тестостерона, без побочек на зрение",
            SideEffects = "Минимальные",
            HalfLife = "10 часов",
            CommonDosages = "12.5-25 мг/день",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "tadalafil", Name = "Тадалафил", NameEn = "Tadalafil (Cialis)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Tadalafil",
            Description = "ФДЭ-5 ингибитор. Часто используется на курсе для поддержания либидо и пампинга.",
            Effects = "Улучшение эрекции, мышечный пампинг, снижение давления",
            SideEffects = "Головная боль, заложенность носа, боли в спине",
            HalfLife = "17.5 часов",
            CommonDosages = "5 мг/день (ежедневно) или 10-20 мг по необходимости",
            PubMedSearchTerm = "tadalafil",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "finasteride", Name = "Финастерид", NameEn = "Finasteride (Proscar/Propecia)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Finasteride",
            Description = "Ингибитор 5-альфа-редуктазы. Защита от выпадения волос на курсе тестостерона.",
            Effects = "Снижение ДГТ, защита волос от андрогенной алопеции",
            SideEffects = "Снижение либидо, ЭД (редко), депрессия (post-finasteride syndrome)",
            HalfLife = "6-8 часов",
            CommonDosages = "1 мг/день",
            PubMedSearchTerm = "finasteride",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "dutasteride", Name = "Дутастерид", NameEn = "Dutasteride (Avodart)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Dutasteride",
            Description = "Двойной ингибитор 5-альфа-редуктазы (тип I и II). Мощнее финастерида.",
            Effects = "Максимальное снижение ДГТ, защита волос",
            SideEffects = "Снижение либидо, ЭД, длительный период выведения",
            HalfLife = "5 недель",
            CommonDosages = "0.5 мг/день или через день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "raloxifene", Name = "Ралоксифен", NameEn = "Raloxifene (Evista)",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.SERM, DrugType = DrugType.Oral,
            ActiveSubstance = "Raloxifene",
            Description = "SERM второго поколения. Эффективен для лечения гинекомастии.",
            Effects = "Лечение гинекомастии, блокировка эстрогена в молочных железах",
            SideEffects = "Приливы жара, судороги ног",
            HalfLife = "27 часов",
            CommonDosages = "60 мг/день (лечение гино), 30 мг/день (профилактика)",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "toremifene", Name = "Торемифен", NameEn = "Toremifene (Fareston)",
            Category = DrugCategory.PCT, Subcategory = DrugSubcategory.SERM, DrugType = DrugType.Oral,
            ActiveSubstance = "Toremifene Citrate",
            Description = "SERM, аналог тамоксифена. Используется для ПКТ и профилактики гинекомастии.",
            Effects = "Восстановление ГПНГ, блокировка эстрогена в груди",
            SideEffects = "Приливы жара, потливость",
            HalfLife = "5 дней",
            CommonDosages = "60 мг/день (ПКТ)",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "nandrolone-cypionate", Name = "Нандролон Ципионат", NameEn = "Nandrolone Cypionate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Nandrolone, DrugType = DrugType.Injectable,
            ActiveSubstance = "Nandrolone Cypionate",
            Description = "Редкий эфир нандролона. Промежуточный между NPP и Deca по времени действия.",
            Effects = "Набор массы, смазка суставов",
            SideEffects = "Прогестиновая активность, подавление ГПНГ",
            HalfLife = "5-6 дней",
            CommonDosages = "200-400 мг/нед",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "oxabolone", Name = "Оксаболон", NameEn = "Oxabolone Cypionate",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Injectable,
            ActiveSubstance = "Oxabolone Cypionate",
            Description = "19-нор стероид. Редко встречается.",
            Effects = "Анаболический эффект, набор массы",
            SideEffects = "Прогестиновая активность, подавление ГПНГ",
            HalfLife = "5-7 дней",
            CommonDosages = "200-400 мг/нед",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "superdrol", Name = "Супердрол", NameEn = "Superdrol (Methasterone)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.OralAAS, DrugType = DrugType.Oral,
            ActiveSubstance = "Methasterone",
            Description = "Мощнейший оральный стероид. Сухая масса без ароматизации.",
            Effects = "Экстремальный набор сухой массы, сила, жёсткость",
            SideEffects = "Высокая гепатотоксичность, летаргия, снижение аппетита",
            HalfLife = "8-9 часов",
            CommonDosages = "10-20 мг/день, не более 4 недель",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "epistane", Name = "Эпистан", NameEn = "Epistane (Havoc)",
            Category = DrugCategory.Prohormone, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "2a,3a-epithio-17a-methyl-5a-androstan-17b-ol",
            Description = "Прогормон/дизайнерский стероид. Сухая масса, анти-эстрогенный.",
            Effects = "Сухая масса, жёсткость, анти-эстрогенный эффект",
            SideEffects = "Гепатотоксичность, подавление ГПНГ, боль в суставах",
            HalfLife = "6 часов",
            CommonDosages = "30-40 мг/день, 4-6 недель",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "mk-677", Name = "МК-677 (Ибутаморен)", NameEn = "MK-677 (Ibutamoren)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.GHRP, DrugType = DrugType.Oral,
            ActiveSubstance = "Ibutamoren",
            Description = "Оральный секретагог ГР (не пептид). Повышает ГР и IGF-1 без инъекций.",
            Effects = "Повышение ГР и IGF-1, улучшение сна, аппетит, восстановление",
            SideEffects = "Сильный аппетит, задержка воды, повышение сахара, летаргия",
            HalfLife = "24 часа",
            CommonDosages = "10-25 мг/день (перед сном)",
            IsPopular = true, SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "pt-141", Name = "PT-141 (Бремеланотид)", NameEn = "PT-141 (Bremelanotide)",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.Melanotropin, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Bremelanotide",
            Description = "Аналог меланокортина. Повышает либидо у мужчин и женщин.",
            Effects = "Сильное повышение либидо и сексуального возбуждения",
            SideEffects = "Тошнота, покраснение лица, повышение давления",
            HalfLife = "~2 часа",
            CommonDosages = "1-2 мг подкожно за 30-60 мин до полового акта",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "kisspeptin", Name = "Кисспептин", NameEn = "Kisspeptin-10",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.General, DrugType = DrugType.Subcutaneous,
            ActiveSubstance = "Kisspeptin-10",
            Description = "Нейропептид. Стимулирует ГнРГ для восстановления ГПНГ.",
            Effects = "Стимуляция ГПНГ, повышение ЛГ/ФСГ/тестостерона",
            SideEffects = "Минимальные, мало изучен",
            HalfLife = "~30 минут",
            CommonDosages = "Экспериментальные дозы",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "selank", Name = "Селанк", NameEn = "Selank",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.General, DrugType = DrugType.Nasal,
            ActiveSubstance = "Selank",
            Description = "Ноотропный пептид. Анксиолитическое и иммуномодулирующее действие.",
            Effects = "Снижение тревожности, улучшение когнитивных функций, иммуномодуляция",
            SideEffects = "Минимальные",
            CommonDosages = "250-500 мкг интраназально 2-3 раза/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "semax", Name = "Семакс", NameEn = "Semax",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.General, DrugType = DrugType.Nasal,
            ActiveSubstance = "Semax",
            Description = "Ноотропный пептид на основе АКТГ. Улучшает память и концентрацию.",
            Effects = "Улучшение памяти, концентрации, нейропротекция",
            SideEffects = "Минимальные, раздражение слизистой носа",
            CommonDosages = "200-600 мкг интраназально 2-3 раза/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "dihexa", Name = "Дигекса", NameEn = "Dihexa",
            Category = DrugCategory.Peptide, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Dihexa",
            Description = "Мощнейший ноотроп. В 10 000 000 раз сильнее BDNF на нейрогенез.",
            Effects = "Улучшение памяти, нейрогенез, когнитивные функции",
            SideEffects = "Мало данных о долгосрочной безопасности",
            CommonDosages = "10-20 мг/день сублингвально",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-cream", Name = "Тестостерон (крем)", NameEn = "Testosterone Cream",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Transdermal,
            ActiveSubstance = "Testosterone",
            Description = "Трансдермальный тестостерон. Удобен для ЗГТ, стабильные уровни.",
            Effects = "Повышение тестостерона, улучшение либидо и настроения",
            SideEffects = "Раздражение кожи, трансфер при контакте, конверсия в ДГТ",
            HalfLife = "~10 часов (пиковый уровень)",
            CommonDosages = "50-100 мг/день на кожу (плечи, бёдра, мошонка)",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "testosterone-nasal", Name = "Тестостерон (назальный)", NameEn = "Testosterone Nasal (Natesto)",
            Category = DrugCategory.AAS, Subcategory = DrugSubcategory.Testosterone, DrugType = DrugType.Nasal,
            ActiveSubstance = "Testosterone",
            Description = "Назальный гель с тестостероном. Быстрые пульсы, имитирует физиологию.",
            Effects = "Быстрое повышение тестостерона, минимальное подавление ГПНГ",
            SideEffects = "Раздражение слизистой, насморк",
            HalfLife = "~1 час (назальный пик)",
            CommonDosages = "5.5 мг в каждую ноздрю 3 раза/день (Natesto)",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "sildenafil", Name = "Силденафил", NameEn = "Sildenafil (Viagra)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Sildenafil",
            Description = "ФДЭ-5 ингибитор. Улучшает эрекцию и кровоток.",
            Effects = "Улучшение эрекции, пампинг",
            SideEffects = "Головная боль, покраснение лица, заложенность носа, изменение цветовосприятия",
            HalfLife = "3-4 часа",
            CommonDosages = "25-100 мг по необходимости",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "arimistane", Name = "Аримистан", NameEn = "Arimistane (Androsta-3,5-dien-7,17-dione)",
            Category = DrugCategory.AntiEstrogen, Subcategory = DrugSubcategory.AromataseInhibitor, DrugType = DrugType.Oral,
            ActiveSubstance = "Androsta-3,5-dien-7,17-dione",
            Description = "OTC ингибитор ароматазы. Слабее рецептурных AI.",
            Effects = "Мягкое снижение эстрадиола, повышение тестостерона",
            SideEffects = "Боль в суставах (при передозировке)",
            HalfLife = "~2 часа",
            CommonDosages = "25-75 мг/день",
            SortOrder = order++
        });
        items.Add(new DrugCatalogItem
        {
            Id = "dapoxetine", Name = "Дапоксетин", NameEn = "Dapoxetine (Priligy)",
            Category = DrugCategory.Other, Subcategory = DrugSubcategory.General, DrugType = DrugType.Oral,
            ActiveSubstance = "Dapoxetine",
            Description = "SSRI короткого действия для лечения преждевременной эякуляции.",
            Effects = "Увеличение времени полового акта в 3-4 раза",
            SideEffects = "Тошнота, головокружение, диарея",
            HalfLife = "1.5 часа",
            CommonDosages = "30-60 мг за 1-3 часа до полового акта",
            SortOrder = order++
        });

        return items;
    }

    private static List<Manufacturer> GetManufacturers()
    {
        var mfrs = new List<Manufacturer>();
        int order = 0;

        // Pharma
        mfrs.Add(new Manufacturer { Id = "pfizer", Name = "Pfizer", Country = "США", Type = ManufacturerType.Pharmaceutical, Description = "Один из крупнейших фармгигантов мира. Производит Генотропин, Депо-Тестостерон.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "novo-nordisk", Name = "Novo Nordisk", Country = "Дания", Type = ManufacturerType.Pharmaceutical, Description = "Лидер в производстве инсулина и GLP-1 агонистов. Нордитропин, Оземпик, Новорапид.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "eli-lilly", Name = "Eli Lilly", Country = "США", Type = ManufacturerType.Pharmaceutical, Description = "Производит Хумалог, Хуматроп, Тирзепатид.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "ferring", Name = "Ferring Pharmaceuticals", Country = "Швейцария", Type = ManufacturerType.Pharmaceutical, Description = "Специализируется на репродуктивной медицине.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "bayer", Name = "Bayer", Country = "Германия", Type = ManufacturerType.Pharmaceutical, Description = "Производит Небидо (тестостерон ундеканоат), Провирон.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "teva", Name = "Teva", Country = "Израиль", Type = ManufacturerType.Pharmaceutical, Description = "Крупнейший производитель дженериков в мире.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "genescience", Name = "GeneScience Pharmaceuticals", Country = "Китай", Type = ManufacturerType.Pharmaceutical, Description = "Производитель Джинтропина (rHGH). Крупнейший производитель ГР в Азии.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "organon", Name = "Organon", Country = "Нидерланды", Type = ManufacturerType.Pharmaceutical, Description = "Производитель оригинального Сустанона 250 и Дека-Дураболина.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "sun-pharma", Name = "Sun Pharma", Country = "Индия", Type = ManufacturerType.Pharmaceutical, Description = "Крупный индийский фармпроизводитель. Дженерики AI и SERM.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "cipla", Name = "Cipla", Country = "Индия", Type = ManufacturerType.Pharmaceutical, Description = "Индийский производитель дженериков.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "abbvie", Name = "AbbVie", Country = "США", Type = ManufacturerType.Pharmaceutical, Description = "Производит AndroGel (тестостерон гель).", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "schering", Name = "Schering (Bayer Schering)", Country = "Германия", Type = ManufacturerType.Pharmaceutical, Description = "Оригинальный производитель Примоболана и Провирона.", SortOrder = order++ });

        // UGL
        mfrs.Add(new Manufacturer { Id = "balkan-pharma", Name = "Balkan Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Один из самых известных UGL. Высокое качество, проверки HPLC.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "sp-laboratories", Name = "SP Laboratories", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория. Хорошее качество, широкий ассортимент.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "zphc", Name = "ZPHC (Zhengzhou Pharmaceutical)", Country = "Китай", Type = ManufacturerType.UGL, Description = "Крупная китайская лаборатория. Доступные цены, стабильное качество.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "hilma-biocare", Name = "Hilma Biocare", Country = "Европа", Type = ManufacturerType.UGL, Description = "Европейская лаборатория. Высокое качество, GMP стандарты.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "magnus-pharma", Name = "Magnus Pharmaceuticals", Country = "Индия", Type = ManufacturerType.UGL, Description = "Индийский UGL с хорошей репутацией.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "alpha-pharma", Name = "Alpha Pharma", Country = "Индия", Type = ManufacturerType.UGL, Description = "Один из топовых UGL. Известны брендами Alphabol, Rexobol, Induject.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "malay-tiger", Name = "Malay Tiger", Country = "Малайзия", Type = ManufacturerType.UGL, Description = "Малазийская лаборатория с хорошей репутацией.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "gss-labs", Name = "GSS Labs", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "genotech", Name = "Genotech", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский производитель ГР и пептидов.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "dragon-pharma", Name = "Dragon Pharma", Country = "Европа", Type = ManufacturerType.UGL, Description = "Европейский UGL. Широкий ассортимент AAS.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "kalpa-pharma", Name = "Kalpa Pharmaceuticals", Country = "Индия", Type = ManufacturerType.UGL, Description = "Индийская лаборатория с широким ассортиментом.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "vermodje", Name = "Vermodje", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория. Сестринская компания Balkan Pharma.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "sciroxx", Name = "Sciroxx", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL с хорошей репутацией.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "british-dragon", Name = "British Dragon", Country = "Таиланд", Type = ManufacturerType.UGL, Description = "Легендарный тайский UGL. Многократно перезапускался.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "rohm-labs", Name = "Rohm Labs", Country = "Великобритания", Type = ManufacturerType.UGL, Description = "Британский UGL. Популярен в UK.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "lixus-labs", Name = "Lixus Labs", Country = "Великобритания", Type = ManufacturerType.UGL, Description = "Британская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "pro-chem", Name = "Pro Chem", Country = "Великобритания", Type = ManufacturerType.UGL, Description = "Британский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "diamond-pharma", Name = "Diamond Pharma", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "nordic-supplements", Name = "Nordic Supplements", Country = "Швеция", Type = ManufacturerType.UGL, Description = "Скандинавский производитель.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "amplio-labs", Name = "Amplio Labs", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "spectrum-pharma", Name = "Spectrum Pharma", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL с верификацией.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "pharmacom-labs", Name = "Pharmacom Labs", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Крупная молдавская лаборатория. Собственный сайт с проверкой подлинности.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "prime-labs", Name = "Prime Labs", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский производитель AAS.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "mactropin", Name = "Mactropin", Country = "Нидерланды", Type = ManufacturerType.UGL, Description = "Голландский UGL с хорошей репутацией.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "biotech-pharma", Name = "Biotech Pharma", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "canada-peptides", Name = "Canada Peptides", Country = "Канада", Type = ManufacturerType.UGL, Description = "Канадский производитель пептидов и ГР.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "nanox", Name = "Nanox", Country = "Нидерланды", Type = ManufacturerType.UGL, Description = "Голландский производитель пептидов.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "wuhan-st", Name = "Wuhan Sito", Country = "Китай", Type = ManufacturerType.UGL, Description = "Китайский производитель raw порошков.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "ice-pharma", Name = "Ice Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "bodypharm", Name = "BodyPharm", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "cygnus-pharma", Name = "Cygnus Pharmaceutical", Country = "Европа", Type = ManufacturerType.UGL, Description = "Европейская лаборатория с GMP.", SortOrder = order++ });

        // ═══════ v2: Additional manufacturers ═══════

        // Pharma (new)
        mfrs.Add(new Manufacturer { Id = "sandoz", Name = "Sandoz (Novartis)", Country = "Швейцария", Type = ManufacturerType.Pharmaceutical, Description = "Подразделение Novartis по дженерикам. Один из крупнейших производителей дженериков в мире.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "zambon", Name = "Zambon", Country = "Италия", Type = ManufacturerType.Pharmaceutical, Description = "Итальянская фармкомпания. Производитель оригинального Провирона.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "norma-hellas", Name = "Norma Hellas", Country = "Греция", Type = ManufacturerType.Pharmaceutical, Description = "Греческий производитель Дека-Дураболина и Тестостерона.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "desma", Name = "Desma", Country = "Испания", Type = ManufacturerType.Pharmaceutical, Description = "Испанский производитель оригинального Винстрола (Winstrol Depot).", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "aburaihan", Name = "Aburaihan Co", Country = "Иран", Type = ManufacturerType.Pharmaceutical, Description = "Иранская фармкомпания. Производит тестостерон энантат (Iran Hormone).", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "watson-pharma", Name = "Watson Pharma", Country = "США", Type = ManufacturerType.Pharmaceutical, Description = "Американский производитель тестостерона ципионата для ЗГТ.", SortOrder = order++ });

        // UGL (new)
        mfrs.Add(new Manufacturer { Id = "andras-pharma", Name = "Andras Pharma", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория с верификацией подлинности.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "golden-dragon", Name = "Golden Dragon Pharmaceuticals", Country = "Гонконг", Type = ManufacturerType.UGL, Description = "Гонконгская лаборатория. Широкий ассортимент AAS и пептидов.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "zerox-pharma", Name = "Zerox Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL. Доступные цены.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "zetta-pharma", Name = "ZETTA Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория с системой проверки подлинности.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "genetic-pharma", Name = "Genetic Pharmaceuticals", Country = "Китай", Type = ManufacturerType.UGL, Description = "Китайская лаборатория с широким ассортиментом.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "olymp-labs", Name = "Olymp Labs", Country = "Китай", Type = ManufacturerType.UGL, Description = "Китайский UGL. Популярен в СНГ.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "euro-prime", Name = "Euro Prime Farmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL. GMP производство.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "radjay", Name = "Radjay HealthCare", Country = "Индия", Type = ManufacturerType.UGL, Description = "Индийский производитель AAS и пептидов.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "tesla-pharmacy", Name = "Tesla Pharmacy", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "jera-labs", Name = "Jera Labs", Country = "Китай", Type = ManufacturerType.UGL, Description = "Китайский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "qpharm", Name = "Qpharm", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL с верификацией.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "swiss-med", Name = "Swiss Med", Country = "Швейцария", Type = ManufacturerType.UGL, Description = "Производитель AAS с европейским качеством.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "neolabs", Name = "NeoLabs", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "novagen", Name = "Novagen Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "genesis", Name = "Genesis", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория с хорошей репутацией.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "horizon-pharma", Name = "Horizon Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "dynamic-development", Name = "Dynamic Development Labs", Country = "Таиланд", Type = ManufacturerType.UGL, Description = "Тайская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "envenom-pharm", Name = "Envenom Pharm", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский производитель SARMs и пептидов.", IsPopular = true, SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "chang-pharma", Name = "Chang Pharmaceuticals", Country = "Таиланд", Type = ManufacturerType.UGL, Description = "Тайский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "bm-pharma", Name = "B.M. Pharmaceuticals", Country = "Индия", Type = ManufacturerType.UGL, Description = "Индийский производитель AAS.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "lyka-labs", Name = "Lyka Labs", Country = "Индия", Type = ManufacturerType.UGL, Description = "Индийская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "canada-bio-labs", Name = "Canada Bio Labs", Country = "Канада", Type = ManufacturerType.UGL, Description = "Канадская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "ergo", Name = "Ergo", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "maxpro", Name = "MaxPro", Country = "Индия", Type = ManufacturerType.UGL, Description = "Индийская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "ultra-labs", Name = "Ultra Labs", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "hzph", Name = "HZPH", Country = "Китай", Type = ManufacturerType.UGL, Description = "Китайская лаборатория. Доступные цены.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "gerth-pharma", Name = "Gerth Pharmaceuticals", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "oxypharma", Name = "OxyPharma", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "musc-on", Name = "Musc-on", Country = "Россия", Type = ManufacturerType.UGL, Description = "Российский производитель.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "biolex", Name = "Biolex", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "vertex-pharma", Name = "Vertex", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "oracle-pharma", Name = "Oracle", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "vizega", Name = "Vizega", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавская лаборатория.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "axiolabs", Name = "Axiolabs", Country = "Молдова", Type = ManufacturerType.UGL, Description = "Молдавский UGL.", SortOrder = order++ });
        mfrs.Add(new Manufacturer { Id = "kigtropin", Name = "Kigtropin Biotechnology", Country = "Китай", Type = ManufacturerType.UGL, Description = "Китайский производитель ГР (Kigtropin).", SortOrder = order++ });

        return mfrs;
    }
}
