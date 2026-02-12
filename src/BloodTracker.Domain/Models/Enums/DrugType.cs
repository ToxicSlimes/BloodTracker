namespace BloodTracker.Domain.Models;

/// <summary>Способ приёма препарата</summary>
public enum DrugType
{
    /// <summary>Таблетированная форма (пероральный приём)</summary>
    Oral,

    /// <summary>Инъекционный препарат (внутримышечно)</summary>
    Injectable,

    /// <summary>Подкожная инъекция (инсулин, пептиды, ГР)</summary>
    Subcutaneous,

    /// <summary>Трансдермальная форма (гель, пластырь, крем)</summary>
    Transdermal,

    /// <summary>Назальный спрей</summary>
    Nasal
}
