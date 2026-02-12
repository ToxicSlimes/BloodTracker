namespace BloodTracker.Domain.Models;

/// <summary>Категория фармакологического препарата</summary>
public enum DrugCategory
{
    /// <summary>Анаболические андрогенные стероиды</summary>
    AAS,

    /// <summary>Пептиды (GHRP, GHRH, BPC-157 и др.)</summary>
    Peptide,

    /// <summary>Селективные модуляторы андрогенных рецепторов</summary>
    SARM,

    /// <summary>Послекурсовая терапия (кломифен, тамоксифен, ХГЧ)</summary>
    PCT,

    /// <summary>Жиросжигатели (кленбутерол, сальбутамол, йохимбин)</summary>
    FatBurner,

    /// <summary>Гормон роста (соматропин)</summary>
    GrowthHormone,

    /// <summary>Антиэстрогены — ингибиторы ароматазы и SERM</summary>
    AntiEstrogen,

    /// <summary>Инсулин (быстрый, ультракороткий)</summary>
    Insulin,

    /// <summary>Прогормоны (DHEA, андростенедион)</summary>
    Prohormone,

    /// <summary>Агонисты дофамина (каберголин, прамипексол)</summary>
    DopamineAgonist,

    /// <summary>Прочее (гепатопротекторы, витамины, минералы и т.д.)</summary>
    Other
}
