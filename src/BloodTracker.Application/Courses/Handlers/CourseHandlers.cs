using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Mapping;
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
        return created.ToDto();
    }
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
        return updated.ToDto();
    }
}

public sealed class GetActiveCourseHandler(ICourseRepository repository) : IRequestHandler<GetActiveCourseQuery, CourseDto?>
{
    public async Task<CourseDto?> Handle(GetActiveCourseQuery request, CancellationToken ct)
    {
        var course = await repository.GetActiveAsync(ct);
        return course?.ToDto();
    }
}

public sealed class GetAllCoursesHandler(ICourseRepository repository) : IRequestHandler<GetAllCoursesQuery, List<CourseDto>>
{
    public async Task<List<CourseDto>> Handle(GetAllCoursesQuery request, CancellationToken ct)
    {
        var courses = await repository.GetAllAsync(ct);
        return courses.Select(c => c.ToDto()).ToList();
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

        return new DashboardDto
        {
            ActiveCourse = course?.ToDto(),
            Drugs = drugs.Select(d => d.ToDto(catalogService)).ToList(),
            RecentIntakes = recentIntakes.Select(l => l.ToDto(
                l.PurchaseId.HasValue && purchaseMap.TryGetValue(l.PurchaseId.Value, out var p) ? p : null)).ToList(),
            AnalysesCount = analyses.Count,
            LastAnalysisDate = analyses.OrderByDescending(a => a.Date).FirstOrDefault()?.Date
        };
    }
}
