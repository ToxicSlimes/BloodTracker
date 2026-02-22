using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using MapsterMapper;
using MediatR;
using System;

namespace BloodTracker.Application.Courses.Handlers;

public sealed class CreatePurchaseHandler(IPurchaseRepository repository, IDrugRepository drugRepo, IDrugCatalogService catalogService, IMapper mapper)
    : IRequestHandler<CreatePurchaseCommand, PurchaseDto>
{
    public async Task<PurchaseDto> Handle(CreatePurchaseCommand request, CancellationToken ct)
    {
        if (request.Data.Quantity <= 0)
            throw new ArgumentException("Quantity must be greater than 0");
        if (request.Data.Price < 0)
            throw new ArgumentException("Price cannot be negative");

        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        string? mfrName = null;
        if (!string.IsNullOrEmpty(request.Data.ManufacturerId))
            mfrName = catalogService.GetManufacturerById(request.Data.ManufacturerId)?.Name;

        var purchase = new Purchase
        {
            DrugId = drug.Id,
            DrugName = drug.Name,
            PurchaseDate = request.Data.PurchaseDate,
            Quantity = request.Data.Quantity,
            Price = request.Data.Price,
            Vendor = request.Data.Vendor,
            Notes = request.Data.Notes,
            ManufacturerId = request.Data.ManufacturerId,
            ManufacturerName = mfrName,
            TotalAmount = request.Data.TotalAmount,
            AmountUnit = request.Data.AmountUnit
        };

        var created = await repository.CreateAsync(purchase, ct);
        return mapper.Map<PurchaseDto>(created);
    }
}

public sealed class UpdatePurchaseHandler(IPurchaseRepository repository, IDrugRepository drugRepo, IDrugCatalogService catalogService, IMapper mapper)
    : IRequestHandler<UpdatePurchaseCommand, PurchaseDto>
{
    public async Task<PurchaseDto> Handle(UpdatePurchaseCommand request, CancellationToken ct)
    {
        if (request.Data.Quantity <= 0)
            throw new ArgumentException("Quantity must be greater than 0");
        if (request.Data.Price < 0)
            throw new ArgumentException("Price cannot be negative");

        var purchase = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Purchase {request.Id} not found");

        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        string? mfrName = null;
        if (!string.IsNullOrEmpty(request.Data.ManufacturerId))
            mfrName = catalogService.GetManufacturerById(request.Data.ManufacturerId)?.Name;

        purchase.DrugId = drug.Id;
        purchase.DrugName = drug.Name;
        purchase.PurchaseDate = request.Data.PurchaseDate;
        purchase.Quantity = request.Data.Quantity;
        purchase.Price = request.Data.Price;
        purchase.Vendor = request.Data.Vendor;
        purchase.Notes = request.Data.Notes;
        purchase.ManufacturerId = request.Data.ManufacturerId;
        purchase.ManufacturerName = mfrName;
        purchase.TotalAmount = request.Data.TotalAmount;
        purchase.AmountUnit = request.Data.AmountUnit;

        var updated = await repository.UpdateAsync(purchase, ct);
        return mapper.Map<PurchaseDto>(updated);
    }
}

public sealed class DeletePurchaseHandler(IPurchaseRepository repository) : IRequestHandler<DeletePurchaseCommand, bool>
{
    public async Task<bool> Handle(DeletePurchaseCommand request, CancellationToken ct)
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetAllPurchasesHandler(IPurchaseRepository repository, IMapper mapper)
    : IRequestHandler<GetAllPurchasesQuery, List<PurchaseDto>>
{
    public async Task<List<PurchaseDto>> Handle(GetAllPurchasesQuery request, CancellationToken ct)
    {
        var purchases = await repository.GetAllAsync(ct);
        return purchases.Select(p => mapper.Map<PurchaseDto>(p)).ToList();
    }
}

public sealed class GetPurchasesByDrugHandler(IPurchaseRepository repository, IMapper mapper)
    : IRequestHandler<GetPurchasesByDrugQuery, List<PurchaseDto>>
{
    public async Task<List<PurchaseDto>> Handle(GetPurchasesByDrugQuery request, CancellationToken ct)
    {
        var purchases = await repository.GetByDrugIdAsync(request.DrugId, ct);
        return purchases.Select(p => mapper.Map<PurchaseDto>(p)).ToList();
    }
}

public sealed class GetPurchaseOptionsHandler(
    IPurchaseRepository purchaseRepo,
    IIntakeLogRepository logRepo) : IRequestHandler<GetPurchaseOptionsQuery, List<PurchaseOptionDto>>
{
    public async Task<List<PurchaseOptionDto>> Handle(GetPurchaseOptionsQuery request, CancellationToken ct)
    {
        var purchases = await purchaseRepo.GetByDrugIdAsync(request.DrugId, ct);
        var drugLogs = await logRepo.GetByDrugIdAsync(request.DrugId, ct);

        var options = new List<PurchaseOptionDto>();
        foreach (var p in purchases.OrderByDescending(p => p.PurchaseDate))
        {
            var consumed = drugLogs.Count(l => l.PurchaseId == p.Id);
            var remaining = p.Quantity - consumed;
            options.Add(new PurchaseOptionDto
            {
                Id = p.Id,
                Label = $"{p.Vendor ?? "?"} {p.PurchaseDate:dd.MM.yyyy} (осталось {remaining})",
                RemainingStock = remaining
            });
        }
        return options;
    }
}

public sealed class GetPurchaseVsConsumptionHandler(
    IPurchaseRepository purchaseRepo,
    IIntakeLogRepository logRepo) : IRequestHandler<GetPurchaseVsConsumptionQuery, PurchaseVsConsumptionDto>
{
    public async Task<PurchaseVsConsumptionDto> Handle(GetPurchaseVsConsumptionQuery request, CancellationToken ct)
    {
        var purchases = await purchaseRepo.GetByDrugIdAsync(request.DrugId, ct);
        var drugLogs = await logRepo.GetByDrugIdAsync(request.DrugId, ct);

        var allDates = purchases.Select(p => p.PurchaseDate.Date)
            .Concat(drugLogs.Select(l => l.Date.Date))
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        var timeline = new List<TimelinePointDto>();
        var runningStock = 0;

        foreach (var date in allDates)
        {
            var dayPurchases = purchases.Where(p => p.PurchaseDate.Date == date).Sum(p => p.Quantity);
            var dayConsumption = drugLogs.Count(l => l.Date.Date == date);

            runningStock += dayPurchases - dayConsumption;

            timeline.Add(new TimelinePointDto
            {
                Date = date,
                Purchases = dayPurchases,
                Consumption = dayConsumption,
                RunningStock = runningStock
            });
        }

        return new PurchaseVsConsumptionDto { Timeline = timeline };
    }
}
