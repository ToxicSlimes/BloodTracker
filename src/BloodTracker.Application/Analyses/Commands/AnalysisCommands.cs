using BloodTracker.Application.Analyses.Dto;
using MediatR;

namespace BloodTracker.Application.Analyses.Commands;

public sealed record CreateAnalysisCommand(CreateAnalysisDto Data) : IRequest<AnalysisDto>;
public sealed record UpdateAnalysisCommand(UpdateAnalysisDto Data) : IRequest<AnalysisDto>;
public sealed record DeleteAnalysisCommand(Guid Id) : IRequest<bool>;
public sealed record ImportPdfAnalysisCommand(Stream PdfStream, string? Label) : IRequest<ImportPdfResultDto>;
