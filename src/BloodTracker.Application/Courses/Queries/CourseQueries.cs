using BloodTracker.Application.Courses.Dto;
using MediatR;

namespace BloodTracker.Application.Courses.Queries;

public sealed record GetActiveCourseQuery : IRequest<CourseDto?>;
public sealed record GetAllCoursesQuery : IRequest<List<CourseDto>>;
public sealed record GetAllDrugsQuery : IRequest<List<DrugDto>>;
public sealed record GetDrugsByCourseQuery(Guid CourseId) : IRequest<List<DrugDto>>;
public sealed record GetAllIntakeLogsQuery : IRequest<List<IntakeLogDto>>;
public sealed record GetRecentIntakeLogsQuery(int Count = 10) : IRequest<List<IntakeLogDto>>;
public sealed record GetDashboardQuery : IRequest<DashboardDto>;
