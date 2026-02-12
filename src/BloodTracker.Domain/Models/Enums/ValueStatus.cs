namespace BloodTracker.Domain.Models;

/// <summary>Статус значения анализа относительно референсного диапазона</summary>
public enum ValueStatus
{
    /// <summary>В пределах нормы</summary>
    Normal,

    /// <summary>Ниже референсного диапазона</summary>
    Low,

    /// <summary>Незначительно выше нормы (в пределах 10% от верхней границы)</summary>
    SlightlyHigh,

    /// <summary>Значительно выше референсного диапазона</summary>
    High,

    /// <summary>Нет референсного диапазона для оценки</summary>
    Pending
}
