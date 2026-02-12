using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
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

public sealed class GetDashboardHandler(
    ICourseRepository courseRepo,
    IDrugRepository drugRepo,
    IIntakeLogRepository logRepo,
    IAnalysisRepository analysisRepo,
    IPurchaseRepository purchaseRepo,
    IDrugCatalogService catalogService) : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken ct)
    {
        var course = await courseRepo.GetActiveAsync(ct);
        var drugs = await drugRepo.GetAllAsync(ct);
        var recentIntakes = await logRepo.GetRecentAsync(5, ct);
        var analyses = await analysisRepo.GetAllAsync(ct);
        var allPurchases = await purchaseRepo.GetAllAsync(ct);
        var purchaseMap = allPurchases.ToDictionary(p => p.Id);

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
            Drugs = drugs.Select(d => CreateDrugHandler.MapDrugDto(d, catalogService)).ToList(),
            RecentIntakes = recentIntakes.Select(l => IntakeLogHelper.MapWithLabel(l,
                l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList(),
            AnalysesCount = analyses.Count,
            LastAnalysisDate = analyses.OrderByDescending(a => a.Date).FirstOrDefault()?.Date
        };
    }
}
