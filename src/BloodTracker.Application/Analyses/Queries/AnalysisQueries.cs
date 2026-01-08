using BloodTracker.Application.Analyses.Dto;
using MediatR;

namespace BloodTracker.Application.Analyses.Queries;

public sealed record GetAllAnalysesQuery : IRequest<List<AnalysisDto>>;
public sealed record GetAnalysisByIdQuery(Guid Id) : IRequest<AnalysisDto?>;
public sealed record CompareAnalysesQuery(Guid BeforeId, Guid AfterId) : IRequest<CompareAnalysesDto?>;
public sealed record GetAnalysisAlertsQuery(Guid Id) : IRequest<List<AnalysisValueDto>>;
