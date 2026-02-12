using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using MediatR;
using System;

namespace BloodTracker.Application.Courses.Handlers;

public sealed class CreateDrugHandler(IDrugRepository repository, IDrugCatalogService catalogService) : IRequestHandler<CreateDrugCommand, DrugDto>
{
    public async Task<DrugDto> Handle(CreateDrugCommand request, CancellationToken ct)
    {
        if (!Enum.IsDefined(request.Data.Type))
            throw new ArgumentException($"Invalid drug type: {(int)request.Data.Type}");

        var drug = new Drug
        {
            Name = request.Data.Name,
            Type = request.Data.Type,
            Dosage = request.Data.Dosage,
            Amount = request.Data.Amount,
            Schedule = request.Data.Schedule,
            Notes = request.Data.Notes,
            CourseId = request.Data.CourseId,
            CatalogItemId = request.Data.CatalogItemId,
            ManufacturerId = request.Data.ManufacturerId
        };

        var created = await repository.CreateAsync(drug, ct);
        return MapDrugDto(created, catalogService);
    }

    internal static DrugDto MapDrugDto(Drug d, IDrugCatalogService catalogService)
    {
        string? mfrName = null;
        if (!string.IsNullOrEmpty(d.ManufacturerId))
            mfrName = catalogService.GetManufacturerById(d.ManufacturerId)?.Name;

        return new DrugDto
        {
            Id = d.Id,
            Name = d.Name,
            Type = d.Type,
            Dosage = d.Dosage,
            Amount = d.Amount,
            Schedule = d.Schedule,
            Notes = d.Notes,
            CourseId = d.CourseId,
            CatalogItemId = d.CatalogItemId,
            ManufacturerId = d.ManufacturerId,
            ManufacturerName = mfrName
        };
    }
}

public sealed class GetAllDrugsHandler(IDrugRepository repository, IDrugCatalogService catalogService) : IRequestHandler<GetAllDrugsQuery, List<DrugDto>>
{
    public async Task<List<DrugDto>> Handle(GetAllDrugsQuery request, CancellationToken ct)
    {
        var drugs = await repository.GetAllAsync(ct);
        return drugs.Select(d => CreateDrugHandler.MapDrugDto(d, catalogService)).ToList();
    }
}

public sealed class UpdateDrugHandler(IDrugRepository repository, IDrugCatalogService catalogService) : IRequestHandler<UpdateDrugCommand, DrugDto>
{
    public async Task<DrugDto> Handle(UpdateDrugCommand request, CancellationToken ct)
    {
        if (!Enum.IsDefined(request.Data.Type))
            throw new ArgumentException($"Invalid drug type: {(int)request.Data.Type}");

        var drug = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Id} not found");

        drug.Name = request.Data.Name;
        drug.Type = request.Data.Type;
        drug.Dosage = request.Data.Dosage;
        drug.Amount = request.Data.Amount;
        drug.Schedule = request.Data.Schedule;
        drug.Notes = request.Data.Notes;
        drug.CourseId = request.Data.CourseId;
        drug.CatalogItemId = request.Data.CatalogItemId;
        drug.ManufacturerId = request.Data.ManufacturerId;

        var updated = await repository.UpdateAsync(drug, ct);
        return CreateDrugHandler.MapDrugDto(updated, catalogService);
    }
}

public sealed class DeleteDrugHandler(
    IDrugRepository repository,
    IIntakeLogRepository logRepo,
    IPurchaseRepository purchaseRepo) : IRequestHandler<DeleteDrugCommand, bool>
{
    public async Task<bool> Handle(DeleteDrugCommand request, CancellationToken ct)
    {
        var drug = await repository.GetByIdAsync(request.Id, ct);
        if (drug is null) return false;

        // Cascade: delete related intake logs
        var logs = await logRepo.GetAllAsync(ct);
        foreach (var log in logs.Where(l => l.DrugId == request.Id))
            await logRepo.DeleteAsync(log.Id, ct);

        // Cascade: delete related purchases
        var purchases = await purchaseRepo.GetByDrugIdAsync(request.Id, ct);
        foreach (var p in purchases)
            await purchaseRepo.DeleteAsync(p.Id, ct);

        return await repository.DeleteAsync(request.Id, ct);
    }
}

public sealed class GetDrugStatisticsHandler(
    IPurchaseRepository purchaseRepo,
    IIntakeLogRepository logRepo,
    IDrugRepository drugRepo) : IRequestHandler<GetDrugStatisticsQuery, DrugStatisticsDto>
{
    public async Task<DrugStatisticsDto> Handle(GetDrugStatisticsQuery request, CancellationToken ct)
    {
        var drug = await drugRepo.GetByIdAsync(request.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.DrugId} not found");

        var purchases = await purchaseRepo.GetByDrugIdAsync(request.DrugId, ct);
        var logs = await logRepo.GetAllAsync(ct);
        var drugLogs = logs.Where(l => l.DrugId == request.DrugId).ToList();

        var totalPurchased = purchases.Sum(p => p.Quantity);
        var totalConsumed = drugLogs.Count;
        var totalSpent = purchases.Sum(p => p.Price);

        return new DrugStatisticsDto
        {
            DrugId = request.DrugId,
            DrugName = drug.Name,
            TotalPurchased = totalPurchased,
            TotalConsumed = totalConsumed,
            CurrentStock = totalPurchased - totalConsumed,
            TotalSpent = totalSpent
        };
    }
}

public sealed class GetInventoryHandler(
    IPurchaseRepository purchaseRepo,
    IIntakeLogRepository logRepo,
    IDrugRepository drugRepo) : IRequestHandler<GetInventoryQuery, InventoryDto>
{
    public async Task<InventoryDto> Handle(GetInventoryQuery request, CancellationToken ct)
    {
        var drugs = await drugRepo.GetAllAsync(ct);
        var purchases = await purchaseRepo.GetAllAsync(ct);
        var logs = await logRepo.GetAllAsync(ct);

        var items = new List<InventoryItemDto>();
        var totalSpent = 0m;

        foreach (var drug in drugs)
        {
            var drugPurchases = purchases.Where(p => p.DrugId == drug.Id).ToList();
            var drugLogs = logs.Where(l => l.DrugId == drug.Id).ToList();

            var totalPurchased = drugPurchases.Sum(p => p.Quantity);
            var totalConsumed = drugLogs.Count;
            var spent = drugPurchases.Sum(p => p.Price);
            totalSpent += spent;

            // Per-purchase breakdown
            var breakdown = new List<PerPurchaseStockDto>();
            var allocatedCount = 0;
            foreach (var purchase in drugPurchases.OrderBy(p => p.PurchaseDate))
            {
                var consumed = drugLogs.Count(l => l.PurchaseId == purchase.Id);
                allocatedCount += consumed;
                breakdown.Add(new PerPurchaseStockDto
                {
                    PurchaseId = purchase.Id,
                    Label = IntakeLogHelper.BuildPurchaseLabel(purchase),
                    Purchased = purchase.Quantity,
                    Consumed = consumed,
                    Remaining = purchase.Quantity - consumed
                });
            }
            var unallocated = drugLogs.Count(l => l.PurchaseId is null);

            items.Add(new InventoryItemDto
            {
                DrugId = drug.Id,
                DrugName = drug.Name,
                TotalPurchased = totalPurchased,
                TotalConsumed = totalConsumed,
                CurrentStock = totalPurchased - totalConsumed,
                TotalSpent = spent,
                LastPurchaseDate = drugPurchases.OrderByDescending(p => p.PurchaseDate).FirstOrDefault()?.PurchaseDate,
                LastIntakeDate = drugLogs.OrderByDescending(l => l.Date).FirstOrDefault()?.Date,
                PurchaseBreakdown = breakdown,
                UnallocatedConsumed = unallocated
            });
        }

        return new InventoryDto
        {
            Items = items.OrderBy(i => i.DrugName).ToList(),
            TotalDrugs = items.Count,
            TotalSpent = totalSpent
        };
    }
}

public sealed class GetConsumptionTimelineHandler(IIntakeLogRepository repository)
    : IRequestHandler<GetConsumptionTimelineQuery, ConsumptionTimelineDto>
{
    public async Task<ConsumptionTimelineDto> Handle(GetConsumptionTimelineQuery request, CancellationToken ct)
    {
        var logs = await repository.GetAllAsync(ct);
        var drugLogs = logs.Where(l => l.DrugId == request.DrugId).ToList();

        if (request.StartDate is not null)
            drugLogs = drugLogs.Where(l => l.Date >= request.StartDate.Value).ToList();

        if (request.EndDate is not null)
            drugLogs = drugLogs.Where(l => l.Date <= request.EndDate.Value).ToList();

        var grouped = drugLogs
            .GroupBy(l => l.Date.Date)
            .Select(g => new ConsumptionDataPointDto
            {
                Date = g.Key,
                Count = g.Count()
            })
            .OrderBy(d => d.Date)
            .ToList();

        return new ConsumptionTimelineDto { DataPoints = grouped };
    }
}
