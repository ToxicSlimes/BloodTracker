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
