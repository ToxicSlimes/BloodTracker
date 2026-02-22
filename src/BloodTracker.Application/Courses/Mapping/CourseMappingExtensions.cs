using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Domain.Models;
using System;

namespace BloodTracker.Application.Courses.Mapping;

/// <summary>
/// Unified mapping extensions for Course domain entities to DTOs.
/// Replaces duplicated inline mapping and static helper methods.
/// </summary>
public static class CourseMappingExtensions
{
    /// <summary>
    /// Builds a human-readable label for a purchase (vendor + date).
    /// </summary>
    public static string BuildPurchaseLabel(Purchase purchase)
        => $"{purchase.Vendor ?? "?"} {purchase.PurchaseDate:dd.MM.yyyy}";

    /// <summary>
    /// Maps Course entity to CourseDto with calculated CurrentDay and TotalDays.
    /// </summary>
    public static CourseDto ToDto(this Course course)
    {
        return new CourseDto
        {
            Id = course.Id,
            Title = course.Title,
            StartDate = course.StartDate,
            EndDate = course.EndDate,
            Notes = course.Notes,
            IsActive = course.IsActive,
            CurrentDay = course.StartDate is null 
                ? 0 
                : Math.Max(0, (DateTime.Today - course.StartDate.Value).Days + 1),
            TotalDays = course.StartDate is null || course.EndDate is null 
                ? 0 
                : (course.EndDate.Value - course.StartDate.Value).Days + 1
        };
    }

    /// <summary>
    /// Maps Drug entity to DrugDto with manufacturer name resolution.
    /// </summary>
    /// <param name="drug">Drug entity</param>
    /// <param name="catalogService">Catalog service for manufacturer lookup</param>
    public static DrugDto ToDto(this Drug drug, IDrugCatalogService catalogService)
    {
        string? mfrName = null;
        if (!string.IsNullOrEmpty(drug.ManufacturerId))
            mfrName = catalogService.GetManufacturerById(drug.ManufacturerId)?.Name;

        return new DrugDto
        {
            Id = drug.Id,
            Name = drug.Name,
            Type = drug.Type,
            Dosage = drug.Dosage,
            Amount = drug.Amount,
            Schedule = drug.Schedule,
            Notes = drug.Notes,
            CourseId = drug.CourseId,
            CatalogItemId = drug.CatalogItemId,
            ManufacturerId = drug.ManufacturerId,
            ManufacturerName = mfrName,
            StandardDoseValue = drug.StandardDoseValue,
            StandardDoseUnit = drug.StandardDoseUnit,
            ConcentrationMgPerMl = drug.ConcentrationMgPerMl,
            PackageSize = drug.PackageSize,
            PackageUnit = drug.PackageUnit
        };
    }

    /// <summary>
    /// Maps IntakeLog entity to IntakeLogDto without purchase information.
    /// Use ToDto(IntakeLog, Purchase?) overload when purchase label is needed.
    /// </summary>
    public static IntakeLogDto ToDto(this IntakeLog log)
    {
        return new IntakeLogDto
        {
            Id = log.Id,
            Date = log.Date,
            DrugId = log.DrugId,
            DrugName = log.DrugName,
            Dose = log.Dose,
            Note = log.Note,
            PurchaseId = log.PurchaseId,
            PurchaseLabel = null,
            DoseValue = log.DoseValue,
            DoseUnit = log.DoseUnit,
            DoseMultiplier = log.DoseMultiplier,
            ConsumedAmount = log.ConsumedAmount,
            ConsumedUnit = log.ConsumedUnit
        };
    }

    /// <summary>
    /// Maps IntakeLog entity to IntakeLogDto with purchase label.
    /// </summary>
    public static IntakeLogDto ToDto(this IntakeLog log, Purchase? purchase)
    {
        return new IntakeLogDto
        {
            Id = log.Id,
            Date = log.Date,
            DrugId = log.DrugId,
            DrugName = log.DrugName,
            Dose = log.Dose,
            Note = log.Note,
            PurchaseId = log.PurchaseId,
            PurchaseLabel = purchase is not null
                ? $"{purchase.Vendor ?? "?"} {purchase.PurchaseDate:dd.MM.yyyy}"
                : null,
            DoseValue = log.DoseValue,
            DoseUnit = log.DoseUnit,
            DoseMultiplier = log.DoseMultiplier,
            ConsumedAmount = log.ConsumedAmount,
            ConsumedUnit = log.ConsumedUnit
        };
    }

    /// <summary>
    /// Maps Purchase entity to PurchaseDto.
    /// Note: PurchaseHandlers use Mapster (IMapper), but this provides consistency.
    /// </summary>
    public static PurchaseDto ToDto(this Purchase purchase)
    {
        return new PurchaseDto
        {
            Id = purchase.Id,
            DrugId = purchase.DrugId,
            DrugName = purchase.DrugName,
            PurchaseDate = purchase.PurchaseDate,
            Quantity = purchase.Quantity,
            Price = purchase.Price,
            Vendor = purchase.Vendor,
            Notes = purchase.Notes,
            ManufacturerId = purchase.ManufacturerId,
            ManufacturerName = purchase.ManufacturerName,
            TotalAmount = purchase.TotalAmount,
            AmountUnit = purchase.AmountUnit
        };
    }
}
