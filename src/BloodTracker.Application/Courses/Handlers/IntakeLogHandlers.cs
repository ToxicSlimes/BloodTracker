using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Mapping;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using MediatR;

namespace BloodTracker.Application.Courses.Handlers;

public sealed class CreateIntakeLogHandler(IIntakeLogRepository logRepo, IDrugRepository drugRepo, IPurchaseRepository purchaseRepo, IDoseParser doseParser)
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

        DoseResult? doseResult = null;
        if (!string.IsNullOrWhiteSpace(request.Data.Dose) && drug.StandardDoseValue is not null)
            doseResult = doseParser.Parse(request.Data.Dose, drug);

        var log = new IntakeLog
        {
            Date = request.Data.Date,
            DrugId = drug.Id,
            DrugName = drug.Name,
            Dose = request.Data.Dose,
            Note = request.Data.Note,
            PurchaseId = request.Data.PurchaseId,
            DoseValue = request.Data.DoseValue ?? doseResult?.DoseValue,
            DoseUnit = request.Data.DoseUnit ?? doseResult?.DoseUnit,
            DoseMultiplier = request.Data.DoseMultiplier ?? doseResult?.DoseMultiplier,
            ConsumedAmount = doseResult?.ConsumedAmount,
            ConsumedUnit = doseResult?.ConsumedUnit
        };

        var created = await logRepo.CreateAsync(log, ct);
        return created.ToDto(request.Data.PurchaseId is not null
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
        return logs.Select(l => l.ToDto(
            l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList();
    }
}

public sealed class GetAllIntakeLogsHandler(IIntakeLogRepository repository, IPurchaseRepository purchaseRepo)
    : IRequestHandler<GetAllIntakeLogsQuery, List<IntakeLogDto>>
{
    public async Task<List<IntakeLogDto>> Handle(GetAllIntakeLogsQuery request, CancellationToken ct)
    {
        var logs = await repository.GetAllAsync(ct);
        var purchases = await purchaseRepo.GetAllAsync(ct);
        var purchaseMap = purchases.ToDictionary(p => p.Id);
        return logs.Select(l => l.ToDto(
            l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList();
    }
}

public sealed class UpdateIntakeLogHandler(IIntakeLogRepository logRepo, IDrugRepository drugRepo, IPurchaseRepository purchaseRepo, IDoseParser doseParser)
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

        DoseResult? doseResult = null;
        if (!string.IsNullOrWhiteSpace(request.Data.Dose) && drug.StandardDoseValue is not null)
            doseResult = doseParser.Parse(request.Data.Dose, drug);

        log.Date = request.Data.Date;
        log.DrugId = drug.Id;
        log.DrugName = drug.Name;
        log.Dose = request.Data.Dose;
        log.Note = request.Data.Note;
        log.PurchaseId = request.Data.PurchaseId;
        log.DoseValue = request.Data.DoseValue ?? doseResult?.DoseValue;
        log.DoseUnit = request.Data.DoseUnit ?? doseResult?.DoseUnit;
        log.DoseMultiplier = request.Data.DoseMultiplier ?? doseResult?.DoseMultiplier;
        log.ConsumedAmount = doseResult?.ConsumedAmount;
        log.ConsumedUnit = doseResult?.ConsumedUnit;

        var updated = await logRepo.UpdateAsync(log, ct);
        return updated.ToDto(request.Data.PurchaseId is not null
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
        var logs = request.DrugId is not null
            ? await repository.GetByDrugIdAsync(request.DrugId.Value, ct)
            : await repository.GetAllAsync(ct);

        if (request.StartDate is not null)
            logs = logs.Where(l => l.Date >= request.StartDate.Value).ToList();

        if (request.EndDate is not null)
            logs = logs.Where(l => l.Date <= request.EndDate.Value).ToList();

        logs = logs.OrderByDescending(l => l.Date).ToList();

        if (request.Limit is not null && request.Limit > 0)
            logs = logs.Take(request.Limit.Value).ToList();

        var purchases = await purchaseRepo.GetAllAsync(ct);
        var purchaseMap = purchases.ToDictionary(p => p.Id);

        return logs.Select(l => l.ToDto(
            l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList();
    }
}
