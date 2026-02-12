namespace BloodTracker.Domain.Models;

/// <summary>Группа мышц для тренировочных программ</summary>
public enum MuscleGroup
{
    /// <summary>Всё тело (Full Body тренировка)</summary>
    FullBody,

    /// <summary>Грудные мышцы</summary>
    Chest,

    /// <summary>Мышцы спины (широчайшие, трапеция, ромбовидные)</summary>
    Back,

    /// <summary>Дельтовидные мышцы (передняя, средняя, задняя)</summary>
    Shoulders,

    /// <summary>Бицепс (двуглавая мышца плеча)</summary>
    Biceps,

    /// <summary>Трицепс (трёхглавая мышца плеча)</summary>
    Triceps,

    /// <summary>Предплечья (сгибатели/разгибатели кисти)</summary>
    Forearms,

    /// <summary>Пресс (прямая и косые мышцы живота)</summary>
    Abs,

    /// <summary>Ягодичные мышцы</summary>
    Glutes,

    /// <summary>Квадрицепс (четырёхглавая мышца бедра)</summary>
    Quadriceps,

    /// <summary>Бицепс бедра (задняя поверхность)</summary>
    Hamstrings,

    /// <summary>Икроножные мышцы</summary>
    Calves
}
