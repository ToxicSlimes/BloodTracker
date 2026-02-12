using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using MediatR;

namespace BloodTracker.Application.Courses.Handlers;

public sealed class CreateIntakeLogHandler(IIntakeLogRepository logRepo, IDrugRepository drugRepo, IPurchaseRepository purchaseRepo)
    : IRequestHandler<CreateIntakeLogCommand, IntakeLogDto>
{
    public async Task<IntakeLogDto> Handle(CreateIntakeLogCommand request, CancellationToken ct)
    {
        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        if (request.Data.PurchaseId is not null)
        {
            var purchase = await purchaseRepo.GetByIdAsync(request.Data.PurchaseId.Value, ct)
                ?? throw new KeyNotFoundException($"Purchase {request.Data.PurchaseId} not found");
            if (purchase.DrugId != drug.Id)
                throw new InvalidOperationException("Purchase does not belong to this drug");

            // Prevent over-consumption: check remaining stock for this purchase
            var allLogs = await logRepo.GetAllAsync(ct);
            var consumed = allLogs.Count(l => l.PurchaseId == purchase.Id);
            if (consumed >= purchase.Quantity)
                throw new InvalidOperationException($"Purchase has no remaining stock ({consumed}/{purchase.Quantity} consumed)");
        }

        var log = new IntakeLog
        {
            Date = request.Data.Date,
            DrugId = drug.Id,
            DrugName = drug.Name,
            Dose = request.Data.Dose,
            Note = request.Data.Note,
            PurchaseId = request.Data.PurchaseId
        };

        var created = await logRepo.CreateAsync(log, ct);
        return IntakeLogHelper.MapWithLabel(created, request.Data.PurchaseId is not null
            ? await purchaseRepo.GetByIdAsync(request.Data.PurchaseId.Value, ct) : null);
    }
}

public sealed class GetRecentIntakeLogsHandler(IIntakeLogRepository repository, IPurchaseRepository purchaseRepo)
    : IRequestHandler<GetRecentIntakeLogsQuery, List<IntakeLogDto>>
{
    public async Task<List<IntakeLogDto>> Handle(GetRecentIntakeLogsQuery request, CancellationToken ct)
    {
        var logs = await repository.GetRecentAsync(request.Count, ct);
        var purchases = await purchaseRepo.GetAllAsync(ct);
        var purchaseMap = purchases.ToDictionary(p => p.Id);
        return logs.Select(l => IntakeLogHelper.MapWithLabel(l,
            l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList();
    }
}

public sealed class UpdateIntakeLogHandler(IIntakeLogRepository logRepo, IDrugRepository drugRepo, IPurchaseRepository purchaseRepo)
    : IRequestHandler<UpdateIntakeLogCommand, IntakeLogDto>
{
    public async Task<IntakeLogDto> Handle(UpdateIntakeLogCommand request, CancellationToken ct)
    {
        var log = await logRepo.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"IntakeLog {request.Id} not found");

        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        if (request.Data.PurchaseId is not null)
        {
            var purchase = await purchaseRepo.GetByIdAsync(request.Data.PurchaseId.Value, ct)
                ?? throw new KeyNotFoundException($"Purchase {request.Data.PurchaseId} not found");
            if (purchase.DrugId != drug.Id)
                throw new InvalidOperationException("Purchase does not belong to this drug");
        }

        log.Date = request.Data.Date;
        log.DrugId = drug.Id;
        log.DrugName = drug.Name;
        log.Dose = request.Data.Dose;
        log.Note = request.Data.Note;
        log.PurchaseId = request.Data.PurchaseId;

        var updated = await logRepo.UpdateAsync(log, ct);
        return IntakeLogHelper.MapWithLabel(updated, request.Data.PurchaseId is not null
            ? await purchaseRepo.GetByIdAsync(request.Data.PurchaseId.Value, ct) : null);
    }
}

public sealed class DeleteIntakeLogHandler(IIntakeLogRepository repository) : IRequestHandler<DeleteIntakeLogCommand, bool>
{
    public async Task<bool> Handle(DeleteIntakeLogCommand request, CancellationToken ct) 
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetIntakeLogsByDrugHandler(IIntakeLogRepository repository, IPurchaseRepository purchaseRepo)
    : IRequestHandler<GetIntakeLogsByDrugQuery, List<IntakeLogDto>>
{
    public async Task<List<IntakeLogDto>> Handle(GetIntakeLogsByDrugQuery request, CancellationToken ct)
    {
        var logs = await repository.GetAllAsync(ct);

        if (request.DrugId is not null)
            logs = logs.Where(l => l.DrugId == request.DrugId.Value).ToList();

        if (request.StartDate is not null)
            logs = logs.Where(l => l.Date >= request.StartDate.Value).ToList();

        if (request.EndDate is not null)
            logs = logs.Where(l => l.Date <= request.EndDate.Value).ToList();

        logs = logs.OrderByDescending(l => l.Date).ToList();

        if (request.Limit is not null && request.Limit > 0)
            logs = logs.Take(request.Limit.Value).ToList();

        var purchases = await purchaseRepo.GetAllAsync(ct);
        var purchaseMap = purchases.ToDictionary(p => p.Id);

        return logs.Select(l => IntakeLogHelper.MapWithLabel(l,
            l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList();
    }
}

internal static class IntakeLogHelper
{
    public static string BuildPurchaseLabel(Purchase purchase)
        => $"{purchase.Vendor ?? "?"} {purchase.PurchaseDate:dd.MM.yyyy}";

    public static IntakeLogDto MapWithLabel(IntakeLog log, Purchase? purchase) => new()
    {
        Id = log.Id,
        Date = log.Date,
        DrugId = log.DrugId,
        DrugName = log.DrugName,
        Dose = log.Dose,
        Note = log.Note,
        PurchaseId = log.PurchaseId,
        PurchaseLabel = purchase is not null ? BuildPurchaseLabel(purchase) : null
    };
}
