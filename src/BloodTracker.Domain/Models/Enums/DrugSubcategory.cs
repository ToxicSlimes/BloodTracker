namespace BloodTracker.Domain.Models;

/// <summary>Подкатегория препарата — уточняет категорию</summary>
public enum DrugSubcategory
{
    /// <summary>Без подкатегории</summary>
    None,

    /// <summary>Тестостерон и его эфиры (энантат, ципионат, пропионат)</summary>
    Testosterone,

    /// <summary>Нандролон (деканоат, фенилпропионат)</summary>
    Nandrolone,

    /// <summary>Тренболон (ацетат, энантат)</summary>
    Trenbolone,

    /// <summary>Болденон (ундесиленат)</summary>
    Boldenone,

    /// <summary>Дростанолон (пропионат, энантат) — Мастерон</summary>
    Drostanolone,

    /// <summary>Метенолон (энантат, ацетат) — Примоболан</summary>
    Methenolone,

    /// <summary>Оральные ААС (метандиенон, оксандролон, станозолол и др.)</summary>
    OralAAS,

    /// <summary>Пептиды GHRP (GHRP-2, GHRP-6, ипаморелин, гексарелин)</summary>
    GHRP,

    /// <summary>Пептиды GHRH (CJC-1295, серморелин, тесаморелин)</summary>
    GHRH,

    /// <summary>Восстановительные пептиды (BPC-157, TB-500)</summary>
    HealingPeptide,

    /// <summary>Меланотропины (Melanotan I/II, PT-141)</summary>
    Melanotropin,

    /// <summary>Агонисты GLP-1 (семаглутид, лираглутид)</summary>
    GLP1Agonist,

    /// <summary>Тиреоидные гормоны (T3/T4, тироксин)</summary>
    Thyroid,

    /// <summary>Ингибиторы ароматазы (анастрозол, летрозол, эксеместан)</summary>
    AromataseInhibitor,

    /// <summary>Селективные модуляторы эстрогенных рецепторов (тамоксифен, кломифен)</summary>
    SERM,

    /// <summary>Общая подкатегория</summary>
    General
}
