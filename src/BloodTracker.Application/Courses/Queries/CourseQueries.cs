using BloodTracker.Application.Courses.Dto;
using MediatR;

namespace BloodTracker.Application.Courses.Queries;

public sealed record GetActiveCourseQuery : IRequest<CourseDto?>;
public sealed record GetAllCoursesQuery : IRequest<List<CourseDto>>;
public sealed record GetAllDrugsQuery : IRequest<List<DrugDto>>;
public sealed record GetDrugsByCourseQuery(Guid CourseId) : IRequest<List<DrugDto>>;
public sealed record GetAllIntakeLogsQuery : IRequest<List<IntakeLogDto>>;
public sealed record GetRecentIntakeLogsQuery(int Count = 10) : IRequest<List<IntakeLogDto>>;
public sealed record GetIntakeLogByIdQuery(Guid Id) : IRequest<IntakeLogDto?>;
public sealed record GetIntakeLogsByDrugQuery(Guid? DrugId, DateTime? StartDate, DateTime? EndDate, int? Limit) : IRequest<List<IntakeLogDto>>;
public sealed record GetDashboardQuery : IRequest<DashboardDto>;

public sealed record GetAllPurchasesQuery : IRequest<List<PurchaseDto>>;
public sealed record GetPurchasesByDrugQuery(Guid DrugId) : IRequest<List<PurchaseDto>>;
public sealed record GetDrugStatisticsQuery(Guid DrugId) : IRequest<DrugStatisticsDto>;
public sealed record GetInventoryQuery : IRequest<InventoryDto>;
public sealed record GetConsumptionTimelineQuery(Guid DrugId, DateTime? StartDate, DateTime? EndDate) : IRequest<ConsumptionTimelineDto>;
public sealed record GetPurchaseVsConsumptionQuery(Guid DrugId) : IRequest<PurchaseVsConsumptionDto>;
public sealed record GetPurchaseOptionsQuery(Guid DrugId) : IRequest<List<PurchaseOptionDto>>;
