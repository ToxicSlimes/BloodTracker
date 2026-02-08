using BloodTracker.Application.Courses.Dto;
using MediatR;

namespace BloodTracker.Application.Courses.Commands;

public sealed record CreateCourseCommand(CreateCourseDto Data) : IRequest<CourseDto>;
public sealed record UpdateCourseCommand(Guid Id, CreateCourseDto Data) : IRequest<CourseDto>;
public sealed record DeleteCourseCommand(Guid Id) : IRequest<bool>;

public sealed record CreateDrugCommand(CreateDrugDto Data) : IRequest<DrugDto>;
public sealed record UpdateDrugCommand(Guid Id, UpdateDrugDto Data) : IRequest<DrugDto>;
public sealed record DeleteDrugCommand(Guid Id) : IRequest<bool>;

public sealed record CreateIntakeLogCommand(CreateIntakeLogDto Data) : IRequest<IntakeLogDto>;
public sealed record UpdateIntakeLogCommand(Guid Id, UpdateIntakeLogDto Data) : IRequest<IntakeLogDto>;
public sealed record DeleteIntakeLogCommand(Guid Id) : IRequest<bool>;

public sealed record CreatePurchaseCommand(CreatePurchaseDto Data) : IRequest<PurchaseDto>;
public sealed record UpdatePurchaseCommand(Guid Id, UpdatePurchaseDto Data) : IRequest<PurchaseDto>;
public sealed record DeletePurchaseCommand(Guid Id) : IRequest<bool>;
