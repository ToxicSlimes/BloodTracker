using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;

namespace BloodTracker.Infrastructure.Services;

public sealed class ReferenceRangeService : IReferenceRangeService
{
    private static readonly Dictionary<string, ReferenceRange> Ranges = new()
    {
        ["testosterone"] = new() { Key = "testosterone", Name = "Тестостерон общий", Min = 8.33, Max = 30.19, Unit = "нмоль/л", Category = "Гормоны", Description = "Основной мужской половой гормон. Отвечает за развитие вторичных половых признаков, мышечную массу, либидо и общее самочувствие. Референс: 8.33-30.19 нмоль/л" },
        ["free-testosterone"] = new() { Key = "free-testosterone", Name = "Тестостерон свободный", Min = 0.2188, Max = 0.7708, Unit = "нмоль/л", Category = "Гормоны", Description = "Биологически активная форма тестостерона, не связанная с белками. Более точно отражает андрогенную активность, чем общий тестостерон. Референс: 0.22-0.77 нмоль/л" },
        ["lh"] = new() { Key = "lh", Name = "ЛГ", Min = 0.57, Max = 12.07, Unit = "мМЕ/мл", Category = "Гормоны", Description = "Лютеинизирующий гормон. Стимулирует выработку тестостерона в яичках. Референс: 0.57-12.07 мМЕ/мл" },
        ["fsh"] = new() { Key = "fsh", Name = "ФСГ", Min = 0.95, Max = 11.95, Unit = "мМЕ/мл", Category = "Гормоны", Description = "Фолликулостимулирующий гормон. Регулирует сперматогенез и функцию яичек. Референс: 0.95-11.95 мМЕ/мл" },
        ["prolactin"] = new() { Key = "prolactin", Name = "Пролактин", Min = 72.66, Max = 407.40, Unit = "мМЕ/л", Category = "Гормоны", Description = "Гормон, который в норме повышен у женщин. У мужчин повышенный уровень может подавлять тестостерон и вызывать проблемы с либидо. Референс: 72.66-407.40 мМЕ/л" },
        ["estradiol"] = new() { Key = "estradiol", Name = "Эстрадиол", Min = 40, Max = 161, Unit = "пмоль/л", Category = "Гормоны", Description = "Женский половой гормон, присутствующий и у мужчин. Высокий уровень может вызывать гинекомастию и подавлять тестостерон. Референс: 40-161 пмоль/л" },
        ["shbg"] = new() { Key = "shbg", Name = "ГСПГ", Min = 16.2, Max = 68.5, Unit = "нмоль/л", Category = "Гормоны", Description = "Глобулин, связывающий половые гормоны. Связывает тестостерон, делая его неактивным. Референс: 16.2-68.5 нмоль/л" },
        ["tsh"] = new() { Key = "tsh", Name = "ТТГ", Min = 0.35, Max = 4.94, Unit = "мкМЕ/мл", Category = "Гормоны", Description = "Тиреотропный гормон. Регулирует функцию щитовидной железы, влияет на метаболизм и энергию. Референс: 0.35-4.94 мкМЕ/мл" },
        ["igf1"] = new() { Key = "igf1", Name = "ИФР-1", Min = 115, Max = 358, Unit = "нг/мл", Category = "Гормоны", Description = "Инсулиноподобный фактор роста-1. Стимулирует рост мышц и костей. Референс: 115-358 нг/мл" },
        ["fai"] = new() { Key = "fai", Name = "Индекс своб. андрогенов", Min = 24.5, Max = 113.3, Unit = "%", Category = "Гормоны", Description = "Расчетный показатель соотношения свободного и общего тестостерона. Референс: 24.5-113.3%" },

        ["cholesterol"] = new() { Key = "cholesterol", Name = "Холестерин общий", Min = 3.4, Max = 5.2, Unit = "ммоль/л", Category = "Липиды", Description = "Общий уровень холестерина в крови. Важен для синтеза гормонов, но высокий уровень увеличивает риск сердечно-сосудистых заболеваний. Референс: 3.4-5.2 ммоль/л" },
        ["hdl"] = new() { Key = "hdl", Name = "ЛПВП (HDL)", Min = 1.03, Max = 999, Unit = "ммоль/л", Category = "Липиды", Description = "Липопротеины высокой плотности - \"хороший\" холестерин. Защищает от атеросклероза. Референс: >1.03 ммоль/л" },
        ["ldl"] = new() { Key = "ldl", Name = "ЛПНП (LDL)", Min = 0, Max = 2.6, Unit = "ммоль/л", Category = "Липиды", Description = "Липопротеины низкой плотности - \"плохой\" холестерин. Высокий уровень увеличивает риск атеросклероза. Референс: <2.6 ммоль/л" },
        ["triglycerides"] = new() { Key = "triglycerides", Name = "Триглицериды", Min = 0, Max = 1.7, Unit = "ммоль/л", Category = "Липиды", Description = "Жиры в крови. Высокий уровень связан с риском сердечно-сосудистых заболеваний. Референс: <1.7 ммоль/л" },
        ["vldl"] = new() { Key = "vldl", Name = "ЛПОНП", Min = 0.16, Max = 0.85, Unit = "ммоль/л", Category = "Липиды", Description = "Липопротеины очень низкой плотности. Переносят триглицериды. Референс: 0.16-0.85 ммоль/л" },
        ["atherogenic"] = new() { Key = "atherogenic", Name = "Коэфф. атерогенности", Min = 1.0, Max = 2.5, Unit = "", Category = "Липиды", Description = "Показатель риска развития атеросклероза. Рассчитывается как (ХС общий - ЛПВП) / ЛПВП. Референс: 1.0-2.5" },

        ["alt"] = new() { Key = "alt", Name = "АЛТ", Min = 0, Max = 50, Unit = "Ед/л", Category = "Печень", Description = "Аланинаминотрансфераза. Фермент печени, повышается при повреждении печени. Референс: <50 Ед/л" },
        ["ast"] = new() { Key = "ast", Name = "АСТ", Min = 0, Max = 50, Unit = "Ед/л", Category = "Печень", Description = "Аспартатаминотрансфераза. Фермент печени и мышц, повышается при их повреждении. Референс: <50 Ед/л" },
        ["ggt"] = new() { Key = "ggt", Name = "ГГТ", Min = 0, Max = 55, Unit = "Ед/л", Category = "Печень", Description = "Гамма-глутамилтрансфераза. Чувствительный маркер заболеваний печени и желчевыводящих путей. Референс: <55 Ед/л" },
        ["alp"] = new() { Key = "alp", Name = "Щелочная фосфатаза", Min = 30, Max = 120, Unit = "Ед/л", Category = "Печень", Description = "Фермент, участвующий в метаболизме костей и печени. Референс: 30-120 Ед/л" },
        ["bilirubin"] = new() { Key = "bilirubin", Name = "Билирубин общий", Min = 5, Max = 21, Unit = "мкмоль/л", Category = "Печень", Description = "Продукт распада гемоглобина. Повышается при заболеваниях печени и желчевыводящих путей. Референс: 5-21 мкмоль/л" },
        ["bilirubin-direct"] = new() { Key = "bilirubin-direct", Name = "Билирубин прямой", Min = 0, Max = 3.4, Unit = "мкмоль/л", Category = "Печень", Description = "Связанная форма билирубина. Референс: <3.4 мкмоль/л" },

        ["hemoglobin"] = new() { Key = "hemoglobin", Name = "Гемоглобин", Min = 130, Max = 170, Unit = "г/л", Category = "Общие", Description = "Белок, переносящий кислород в крови. Референс: 130-170 г/л" },
        ["hematocrit"] = new() { Key = "hematocrit", Name = "Гематокрит", Min = 39, Max = 49, Unit = "%", Category = "Общие", Description = "Процентное содержание эритроцитов в крови. Референс: 39-49%" },
        ["glucose"] = new() { Key = "glucose", Name = "Глюкоза", Min = 3.9, Max = 6.1, Unit = "ммоль/л", Category = "Общие", Description = "Уровень сахара в крови. Референс: 3.9-6.1 ммоль/л" },
        ["hba1c"] = new() { Key = "hba1c", Name = "HbA1c", Min = 0, Max = 6.0, Unit = "%", Category = "Общие", Description = "Гликированный гемоглобин. Показывает средний уровень сахара за последние 2-3 месяца. Референс: <6.0%" },
        ["creatinine"] = new() { Key = "creatinine", Name = "Креатинин", Min = 62, Max = 106, Unit = "мкмоль/л", Category = "Общие", Description = "Продукт метаболизма мышц. Показатель функции почек. Референс: 62-106 мкмоль/л" },
        ["urea"] = new() { Key = "urea", Name = "Мочевина", Min = 2.5, Max = 8.3, Unit = "ммоль/л", Category = "Общие", Description = "Продукт распада белков. Референс: 2.5-8.3 ммоль/л" },
        ["protein"] = new() { Key = "protein", Name = "Общий белок", Min = 66, Max = 83, Unit = "г/л", Category = "Общие", Description = "Сумма всех белков в плазме крови. Референс: 66-83 г/л" },
        ["vitd"] = new() { Key = "vitd", Name = "Витамин D", Min = 30, Max = 100, Unit = "нг/мл", Category = "Общие", Description = "Важен для иммунитета, костей и синтеза тестостерона. Референс: 30-100 нг/мл" },
        ["pt"] = new() { Key = "pt", Name = "Протромбиновое время", Min = 12, Max = 16, Unit = "сек", Category = "Коагуляция", Description = "Время свертывания крови. Референс: 12-16 сек" },
        ["pt-percent"] = new() { Key = "pt-percent", Name = "Протромбин % (по Квику)", Min = 70, Max = 120, Unit = "%", Category = "Коагуляция", Description = "Протромбин по Квику, отражает активность факторов свертывания. Референс: 70-120%" },
        ["inr"] = new() { Key = "inr", Name = "МНО", Min = 0.8, Max = 1.2, Unit = "", Category = "Коагуляция", Description = "Международное нормализованное отношение. Показатель свертываемости крови. Референс: 0.8-1.2" },

        ["non-hdl-cholesterol"] = new() { Key = "non-hdl-cholesterol", Name = "Холестерин не-ЛПВП", Min = 0, Max = 3.8, Unit = "ммоль/л", Category = "Липиды", Description = "Атерогенный холестерин (весь холестерин, кроме ЛПВП). Целевой уровень зависит от риска, обычно <3.8 ммоль/л" },
        ["lipoprotein-a"] = new() { Key = "lipoprotein-a", Name = "Липопротеин (а)", Min = 0, Max = 30, Unit = "мг/дл", Category = "Липиды", Description = "Независимый фактор риска атеросклероза. Референс: <30 мг/дл" },

        ["albumin"] = new() { Key = "albumin", Name = "Альбумин", Min = 40.2, Max = 47.6, Unit = "г/л", Category = "Белковые фракции", Description = "Основный белок плазмы, отражает синтетическую функцию печени и белковый статус. Референс: 40.2-47.6 г/л" },
        ["albumin-percent"] = new() { Key = "albumin-percent", Name = "Альбумин %", Min = 55.8, Max = 66.1, Unit = "%", Category = "Белковые фракции", Description = "Доля альбумина в белковых фракциях. Референс: 55.8-66.1%" },
        ["alpha1-globulin"] = new() { Key = "alpha1-globulin", Name = "Альфа-1 глобулин", Min = 2.1, Max = 3.5, Unit = "г/л", Category = "Белковые фракции", Description = "Фракция белков острой фазы. Референс: 2.1-3.5 г/л" },
        ["alpha1-globulin-percent"] = new() { Key = "alpha1-globulin-percent", Name = "Альфа-1 глобулин %", Min = 2.9, Max = 4.9, Unit = "%", Category = "Белковые фракции", Description = "Доля альфа-1 глобулина в белковых фракциях. Референс: 2.9-4.9%" },
        ["alpha2-globulin"] = new() { Key = "alpha2-globulin", Name = "Альфа-2 глобулин", Min = 5.1, Max = 8.5, Unit = "г/л", Category = "Белковые фракции", Description = "Фракция белков, ассоциированных с воспалением и липидным обменом. Референс: 5.1-8.5 г/л" },
        ["alpha2-globulin-percent"] = new() { Key = "alpha2-globulin-percent", Name = "Альфа-2 глобулин %", Min = 7.1, Max = 11.8, Unit = "%", Category = "Белковые фракции", Description = "Доля альфа-2 глобулина в белковых фракциях. Референс: 7.1-11.8%" },
        ["beta1-globulin"] = new() { Key = "beta1-globulin", Name = "Бета-1 глобулин", Min = 3.4, Max = 5.2, Unit = "г/л", Category = "Белковые фракции", Description = "Фракция белков, включающая транспортные белки. Референс: 3.4-5.2 г/л" },
        ["beta1-globulin-percent"] = new() { Key = "beta1-globulin-percent", Name = "Бета-1 глобулин %", Min = 4.7, Max = 7.2, Unit = "%", Category = "Белковые фракции", Description = "Доля бета-1 глобулина в белковых фракциях. Референс: 4.7-7.2%" },
        ["beta2-globulin"] = new() { Key = "beta2-globulin", Name = "Бета-2 глобулин", Min = 2.3, Max = 4.7, Unit = "г/л", Category = "Белковые фракции", Description = "Фракция белков, участвующих в иммунных реакциях. Референс: 2.3-4.7 г/л" },
        ["beta2-globulin-percent"] = new() { Key = "beta2-globulin-percent", Name = "Бета-2 глобулин %", Min = 3.2, Max = 6.5, Unit = "%", Category = "Белковые фракции", Description = "Доля бета-2 глобулина в белковых фракциях. Референс: 3.2-6.5%" },
        ["gamma-globulin"] = new() { Key = "gamma-globulin", Name = "Гамма-глобулин", Min = 8.0, Max = 13.5, Unit = "г/л", Category = "Белковые фракции", Description = "Фракция иммуноглобулинов. Референс: 8.0-13.5 г/л" },
        ["gamma-globulin-percent"] = new() { Key = "gamma-globulin-percent", Name = "Гамма-глобулин %", Min = 11.1, Max = 18.8, Unit = "%", Category = "Белковые фракции", Description = "Доля гамма-глобулина в белковых фракциях. Референс: 11.1-18.8%" },

        ["cholinesterase"] = new() { Key = "cholinesterase", Name = "Холинэстераза", Min = 4.62, Max = 11.50, Unit = "кЕД/л", Category = "Печень", Description = "Фермент печени, отражает синтетическую функцию и состояние печени. Референс: 4.62-11.50 кЕД/л" },
        ["apolipoprotein-a1"] = new() { Key = "apolipoprotein-a1", Name = "Аполипопротеин A1", Min = 1.05, Max = 1.75, Unit = "г/л", Category = "Липиды", Description = "Основной белок частиц ЛПВП, антиатерогенный фактор. Референс: 1.05-1.75 г/л" },
        ["apolipoprotein-b"] = new() { Key = "apolipoprotein-b", Name = "Аполипопротеин B", Min = 0.60, Max = 1.40, Unit = "г/л", Category = "Липиды", Description = "Основной белок частиц ЛПНП и ЛПОНП, атерогенный фактор. Референс: 0.60-1.40 г/л" },
        ["afp"] = new() { Key = "afp", Name = "Альфа-фетопротеин (АФП)", Min = 0, Max = 5.9, Unit = "МЕ/мл", Category = "Онкомаркеры", Description = "Онкомаркер печени и ряда других опухолей. Референс: <5.9 МЕ/мл" }
    };

    public ReferenceRange? GetRange(string key) => Ranges.GetValueOrDefault(key);

    public IReadOnlyList<ReferenceRange> GetAllRanges() => Ranges.Values.ToList();

    public ValueStatus GetStatus(string key, double value)
    {
        if (!Ranges.TryGetValue(key, out var range))
            return ValueStatus.Pending;

        var margin = (range.Max - range.Min) * 0.1;

        if (value < range.Min) return ValueStatus.Low;
        if (value > range.Max + margin) return ValueStatus.High;
        if (value > range.Max) return ValueStatus.SlightlyHigh;
        return ValueStatus.Normal;
    }
}
