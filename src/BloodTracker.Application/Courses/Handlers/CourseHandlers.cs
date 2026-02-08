using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using MapsterMapper;
using MediatR;
using System;

namespace BloodTracker.Application.Courses.Handlers;

public sealed class CreateCourseHandler(ICourseRepository repository) : IRequestHandler<CreateCourseCommand, CourseDto>
{
    public async Task<CourseDto> Handle(CreateCourseCommand request, CancellationToken ct)
    {
        var course = new Course
        {
            Title = request.Data.Title,
            StartDate = request.Data.StartDate,
            EndDate = request.Data.EndDate,
            Notes = request.Data.Notes,
            IsActive = true
        };

        var created = await repository.CreateAsync(course, ct);
        return MapToDto(created);
    }

    private static CourseDto MapToDto(Course c) => new()
    {
        Id = c.Id,
        Title = c.Title,
        StartDate = c.StartDate,
        EndDate = c.EndDate,
        Notes = c.Notes,
        IsActive = c.IsActive,
        CurrentDay = c.StartDate is null ? 0 : Math.Max(0, (DateTime.Today - c.StartDate.Value).Days + 1),
        TotalDays = c.StartDate is null || c.EndDate is null ? 0 : (c.EndDate.Value - c.StartDate.Value).Days + 1
    };
}

public sealed class UpdateCourseHandler(ICourseRepository repository) : IRequestHandler<UpdateCourseCommand, CourseDto>
{
    public async Task<CourseDto> Handle(UpdateCourseCommand request, CancellationToken ct)
    {
        var course = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Course {request.Id} not found");

        course.Title = request.Data.Title;
        course.StartDate = request.Data.StartDate;
        course.EndDate = request.Data.EndDate;
        course.Notes = request.Data.Notes;

        var updated = await repository.UpdateAsync(course, ct);
        return new CourseDto
        {
            Id = updated.Id,
            Title = updated.Title,
            StartDate = updated.StartDate,
            EndDate = updated.EndDate,
            Notes = updated.Notes,
            IsActive = updated.IsActive,
            CurrentDay = updated.StartDate is null ? 0 : Math.Max(0, (DateTime.Today - updated.StartDate.Value).Days + 1),
            TotalDays = updated.StartDate is null || updated.EndDate is null ? 0 : (updated.EndDate.Value - updated.StartDate.Value).Days + 1
        };
    }
}

public sealed class GetActiveCourseHandler(ICourseRepository repository) : IRequestHandler<GetActiveCourseQuery, CourseDto?>
{
    public async Task<CourseDto?> Handle(GetActiveCourseQuery request, CancellationToken ct)
    {
        var course = await repository.GetActiveAsync(ct);
        return course is null ? null : new CourseDto
        {
            Id = course.Id,
            Title = course.Title,
            StartDate = course.StartDate,
            EndDate = course.EndDate,
            Notes = course.Notes,
            IsActive = course.IsActive,
            CurrentDay = course.StartDate is null ? 0 : Math.Max(0, (DateTime.Today - course.StartDate.Value).Days + 1),
            TotalDays = course.StartDate is null || course.EndDate is null ? 0 : (course.EndDate.Value - course.StartDate.Value).Days + 1
        };
    }
}

public sealed class CreateDrugHandler(IDrugRepository repository, IMapper mapper) : IRequestHandler<CreateDrugCommand, DrugDto>
{
    public async Task<DrugDto> Handle(CreateDrugCommand request, CancellationToken ct)
    {
        var drug = new Drug
        {
            Name = request.Data.Name,
            Type = request.Data.Type,
            Dosage = request.Data.Dosage,
            Amount = request.Data.Amount,
            Schedule = request.Data.Schedule,
            Notes = request.Data.Notes,
            CourseId = request.Data.CourseId
        };

        var created = await repository.CreateAsync(drug, ct);
        return mapper.Map<DrugDto>(created);
    }
}

public sealed class GetAllDrugsHandler(IDrugRepository repository, IMapper mapper) : IRequestHandler<GetAllDrugsQuery, List<DrugDto>>
{
    public async Task<List<DrugDto>> Handle(GetAllDrugsQuery request, CancellationToken ct)
    {
        var drugs = await repository.GetAllAsync(ct);
        return drugs.Select(d => mapper.Map<DrugDto>(d)).ToList();
    }
}

public sealed class UpdateDrugHandler(IDrugRepository repository, IMapper mapper) : IRequestHandler<UpdateDrugCommand, DrugDto>
{
    public async Task<DrugDto> Handle(UpdateDrugCommand request, CancellationToken ct)
    {
        var drug = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Id} not found");

        drug.Name = request.Data.Name;
        drug.Type = request.Data.Type;
        drug.Dosage = request.Data.Dosage;
        drug.Amount = request.Data.Amount;
        drug.Schedule = request.Data.Schedule;
        drug.Notes = request.Data.Notes;
        drug.CourseId = request.Data.CourseId;

        var updated = await repository.UpdateAsync(drug, ct);
        return mapper.Map<DrugDto>(updated);
    }
}

public sealed class DeleteDrugHandler(IDrugRepository repository) : IRequestHandler<DeleteDrugCommand, bool>
{
    public async Task<bool> Handle(DeleteDrugCommand request, CancellationToken ct) 
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class CreateIntakeLogHandler(IIntakeLogRepository logRepo, IDrugRepository drugRepo, IMapper mapper) 
    : IRequestHandler<CreateIntakeLogCommand, IntakeLogDto>
{
    public async Task<IntakeLogDto> Handle(CreateIntakeLogCommand request, CancellationToken ct)
    {
        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        var log = new IntakeLog
        {
            Date = request.Data.Date,
            DrugId = drug.Id,
            DrugName = drug.Name,
            Dose = request.Data.Dose,
            Note = request.Data.Note
        };

        var created = await logRepo.CreateAsync(log, ct);
        return mapper.Map<IntakeLogDto>(created);
    }
}

public sealed class GetRecentIntakeLogsHandler(IIntakeLogRepository repository, IMapper mapper) 
    : IRequestHandler<GetRecentIntakeLogsQuery, List<IntakeLogDto>>
{
    public async Task<List<IntakeLogDto>> Handle(GetRecentIntakeLogsQuery request, CancellationToken ct)
    {
        var logs = await repository.GetRecentAsync(request.Count, ct);
        return logs.Select(l => mapper.Map<IntakeLogDto>(l)).ToList();
    }
}

public sealed class UpdateIntakeLogHandler(IIntakeLogRepository logRepo, IDrugRepository drugRepo, IMapper mapper) 
    : IRequestHandler<UpdateIntakeLogCommand, IntakeLogDto>
{
    public async Task<IntakeLogDto> Handle(UpdateIntakeLogCommand request, CancellationToken ct)
    {
        var log = await logRepo.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"IntakeLog {request.Id} not found");

        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        log.Date = request.Data.Date;
        log.DrugId = drug.Id;
        log.DrugName = drug.Name;
        log.Dose = request.Data.Dose;
        log.Note = request.Data.Note;

        var updated = await logRepo.UpdateAsync(log, ct);
        return mapper.Map<IntakeLogDto>(updated);
    }
}

public sealed class DeleteIntakeLogHandler(IIntakeLogRepository repository) : IRequestHandler<DeleteIntakeLogCommand, bool>
{
    public async Task<bool> Handle(DeleteIntakeLogCommand request, CancellationToken ct) 
        => await repository.DeleteAsync(request.Id, ct);
}

public sealed class GetDashboardHandler(
    ICourseRepository courseRepo,
    IDrugRepository drugRepo,
    IIntakeLogRepository logRepo,
    IAnalysisRepository analysisRepo,
    IMapper mapper) : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken ct)
    {
        var course = await courseRepo.GetActiveAsync(ct);
        var drugs = await drugRepo.GetAllAsync(ct);
        var recentIntakes = await logRepo.GetRecentAsync(5, ct);
        var analyses = await analysisRepo.GetAllAsync(ct);

        CourseDto? courseDto = null;
        if (course is not null)
        {
            courseDto = new CourseDto
            {
                Id = course.Id,
                Title = course.Title,
                StartDate = course.StartDate,
                EndDate = course.EndDate,
                Notes = course.Notes,
                IsActive = course.IsActive,
                CurrentDay = course.StartDate is null ? 0 : Math.Max(0, (DateTime.Today - course.StartDate.Value).Days + 1),
                TotalDays = course.StartDate is null || course.EndDate is null ? 0 : (course.EndDate.Value - course.StartDate.Value).Days + 1
            };
        }

        return new DashboardDto
        {
            ActiveCourse = courseDto,
            Drugs = drugs.Select(d => mapper.Map<DrugDto>(d)).ToList(),
            RecentIntakes = recentIntakes.Select(l => mapper.Map<IntakeLogDto>(l)).ToList(),
            AnalysesCount = analyses.Count,
            LastAnalysisDate = analyses.OrderByDescending(a => a.Date).FirstOrDefault()?.Date
        };
    }
}

public sealed class GetIntakeLogsByDrugHandler(IIntakeLogRepository repository, IMapper mapper)
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

        return logs.Select(l => mapper.Map<IntakeLogDto>(l)).ToList();
    }
}

public sealed class CreatePurchaseHandler(IPurchaseRepository repository, IDrugRepository drugRepo, IMapper mapper)
    : IRequestHandler<CreatePurchaseCommand, PurchaseDto>
{
    public async Task<PurchaseDto> Handle(CreatePurchaseCommand request, CancellationToken ct)
    {
        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        var purchase = new Purchase
        {
            DrugId = drug.Id,
            DrugName = drug.Name,
            PurchaseDate = request.Data.PurchaseDate,
            Quantity = request.Data.Quantity,
            Price = request.Data.Price,
            Vendor = request.Data.Vendor,
            Notes = request.Data.Notes
        };

        var created = await repository.CreateAsync(purchase, ct);
        return mapper.Map<PurchaseDto>(created);
    }
}

public sealed class UpdatePurchaseHandler(IPurchaseRepository repository, IDrugRepository drugRepo, IMapper mapper)
    : IRequestHandler<UpdatePurchaseCommand, PurchaseDto>
{
    public async Task<PurchaseDto> Handle(UpdatePurchaseCommand request, CancellationToken ct)
    {
        var purchase = await repository.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Purchase {request.Id} not found");

        var drug = await drugRepo.GetByIdAsync(request.Data.DrugId, ct)
            ?? throw new KeyNotFoundException($"Drug {request.Data.DrugId} not found");

        purchase.DrugId = drug.Id;
        purchase.DrugName = drug.Name;
        purchase.PurchaseDate = request.Data.PurchaseDate;
        purchase.Quantity = request.Data.Quantity;
        purchase.Price = request.Data.Price;
        purchase.Vendor = request.Data.Vendor;
        purchase.Notes = request.Data.Notes;

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

            items.Add(new InventoryItemDto
            {
                DrugId = drug.Id,
                DrugName = drug.Name,
                TotalPurchased = totalPurchased,
                TotalConsumed = totalConsumed,
                CurrentStock = totalPurchased - totalConsumed,
                TotalSpent = spent,
                LastPurchaseDate = drugPurchases.OrderByDescending(p => p.PurchaseDate).FirstOrDefault()?.PurchaseDate,
                LastIntakeDate = drugLogs.OrderByDescending(l => l.Date).FirstOrDefault()?.Date
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

public sealed class GetPurchaseVsConsumptionHandler(
    IPurchaseRepository purchaseRepo,
    IIntakeLogRepository logRepo) : IRequestHandler<GetPurchaseVsConsumptionQuery, PurchaseVsConsumptionDto>
{
    public async Task<PurchaseVsConsumptionDto> Handle(GetPurchaseVsConsumptionQuery request, CancellationToken ct)
    {
        var purchases = await purchaseRepo.GetByDrugIdAsync(request.DrugId, ct);
        var logs = await logRepo.GetAllAsync(ct);
        var drugLogs = logs.Where(l => l.DrugId == request.DrugId).ToList();

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
