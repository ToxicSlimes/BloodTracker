using BloodTracker.Application.Analyses.Commands;
using BloodTracker.Application.Analyses.Dto;
using BloodTracker.Application.Analyses.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using MapsterMapper;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Application.Analyses.Handlers;

public sealed class CreateAnalysisHandler(IAnalysisRepository repository, IMapper mapper, ILogger<CreateAnalysisHandler> logger) 
    : IRequestHandler<CreateAnalysisCommand, AnalysisDto>
{
    public async Task<AnalysisDto> Handle(CreateAnalysisCommand request, CancellationToken ct)
    {
        logger.LogInformation("Creating analysis: {Label} on {Date}", request.Data.Label, request.Data.Date);

        var analysis = new Analysis
        {
            Date = request.Data.Date,
            Label = request.Data.Label,
            Laboratory = request.Data.Laboratory,
            Notes = request.Data.Notes,
            Values = request.Data.Values
        };

        var created = await repository.CreateAsync(analysis, ct);
        logger.LogInformation("Analysis created with ID: {Id}", created.Id);
        
        return mapper.Map<AnalysisDto>(created);
    }
}

public sealed class UpdateAnalysisHandler(IAnalysisRepository repository, IMapper mapper, ILogger<UpdateAnalysisHandler> logger) 
    : IRequestHandler<UpdateAnalysisCommand, AnalysisDto>
{
    public async Task<AnalysisDto> Handle(UpdateAnalysisCommand request, CancellationToken ct)
    {
        logger.LogInformation("Updating analysis: {Id}", request.Data.Id);

        var existing = await repository.GetByIdAsync(request.Data.Id, ct)
            ?? throw new KeyNotFoundException($"Analysis {request.Data.Id} not found");

        existing.Date = request.Data.Date;
        existing.Label = request.Data.Label;
        existing.Laboratory = request.Data.Laboratory;
        existing.Notes = request.Data.Notes;
        existing.Values = request.Data.Values;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await repository.UpdateAsync(existing, ct);
        return mapper.Map<AnalysisDto>(updated);
    }
}

public sealed class DeleteAnalysisHandler(IAnalysisRepository repository, ILogger<DeleteAnalysisHandler> logger) 
    : IRequestHandler<DeleteAnalysisCommand, bool>
{
    public async Task<bool> Handle(DeleteAnalysisCommand request, CancellationToken ct)
    {
        logger.LogInformation("Deleting analysis: {Id}", request.Id);
        return await repository.DeleteAsync(request.Id, ct);
    }
}

public sealed class GetAllAnalysesHandler(IAnalysisRepository repository, IMapper mapper) 
    : IRequestHandler<GetAllAnalysesQuery, List<AnalysisDto>>
{
    public async Task<List<AnalysisDto>> Handle(GetAllAnalysesQuery request, CancellationToken ct)
    {
        var analyses = await repository.GetAllAsync(ct);
        return analyses.Select(a => mapper.Map<AnalysisDto>(a)).ToList();
    }
}

public sealed class GetAnalysisByIdHandler(IAnalysisRepository repository, IMapper mapper) 
    : IRequestHandler<GetAnalysisByIdQuery, AnalysisDto?>
{
    public async Task<AnalysisDto?> Handle(GetAnalysisByIdQuery request, CancellationToken ct)
    {
        var analysis = await repository.GetByIdAsync(request.Id, ct);
        return analysis is null ? null : mapper.Map<AnalysisDto>(analysis);
    }
}

public sealed class CompareAnalysesHandler(
    IAnalysisRepository repository, 
    IReferenceRangeService referenceService, 
    IMapper mapper) 
    : IRequestHandler<CompareAnalysesQuery, CompareAnalysesDto?>
{
    public async Task<CompareAnalysesDto?> Handle(CompareAnalysesQuery request, CancellationToken ct)
    {
        var before = await repository.GetByIdAsync(request.BeforeId, ct);
        var after = await repository.GetByIdAsync(request.AfterId, ct);

        if (before is null || after is null) return null;

        var comparisons = new List<ComparisonValueDto>();
        var allKeys = before.Values.Keys.Union(after.Values.Keys).Distinct();

        foreach (var key in allKeys)
        {
            var range = referenceService.GetRange(key);
            if (range is null) continue;

            before.Values.TryGetValue(key, out var beforeVal);
            after.Values.TryGetValue(key, out var afterVal);

            double? delta = null;
            if (beforeVal > 0 && afterVal > 0)
                delta = ((afterVal - beforeVal) / beforeVal) * 100;

            comparisons.Add(new ComparisonValueDto
            {
                Key = key,
                Name = range.Name,
                Unit = range.Unit,
                BeforeValue = beforeVal > 0 ? beforeVal : null,
                AfterValue = afterVal > 0 ? afterVal : null,
                DeltaPercent = delta,
                BeforeStatus = beforeVal > 0 ? referenceService.GetStatus(key, beforeVal) : ValueStatus.Pending,
                AfterStatus = afterVal > 0 ? referenceService.GetStatus(key, afterVal) : ValueStatus.Pending
            });
        }

        return new CompareAnalysesDto
        {
            Before = mapper.Map<AnalysisDto>(before),
            After = mapper.Map<AnalysisDto>(after),
            Comparisons = comparisons
        };
    }
}

public sealed class GetAnalysisAlertsHandler(IAnalysisRepository repository, IReferenceRangeService referenceService) 
    : IRequestHandler<GetAnalysisAlertsQuery, List<AnalysisValueDto>>
{
    public async Task<List<AnalysisValueDto>> Handle(GetAnalysisAlertsQuery request, CancellationToken ct)
    {
        var analysis = await repository.GetByIdAsync(request.Id, ct);
        if (analysis is null) return [];

        var alerts = new List<AnalysisValueDto>();

        foreach (var (key, value) in analysis.Values)
        {
            var range = referenceService.GetRange(key);
            if (range is null) continue;

            var status = referenceService.GetStatus(key, value);
            if (status is ValueStatus.Low or ValueStatus.SlightlyHigh or ValueStatus.High)
            {
                alerts.Add(new AnalysisValueDto
                {
                    Key = key,
                    Name = range.Name,
                    Value = value,
                    Unit = range.Unit,
                    RefMin = range.Min,
                    RefMax = range.Max,
                    Status = status
                });
            }
        }

        return alerts;
    }
}

public sealed class ImportPdfAnalysisHandler(
    IPdfParserService pdfParser,
    IAnalysisRepository repository,
    IMapper mapper,
    ILogger<ImportPdfAnalysisHandler> logger) 
    : IRequestHandler<ImportPdfAnalysisCommand, ImportPdfResultDto>
{
    public async Task<ImportPdfResultDto> Handle(ImportPdfAnalysisCommand request, CancellationToken ct)
    {
        try
        {
            logger.LogInformation("Starting PDF import");
            
            var parseResult = await pdfParser.ParseAnalysisPdfAsync(request.PdfStream, ct);
            
            if (parseResult.Values.Count == 0)
            {
                return new ImportPdfResultDto
                {
                    Success = false,
                    ErrorMessage = "Не удалось распознать показатели в PDF файле",
                    UnrecognizedItems = parseResult.UnrecognizedItems,
                    DetectedLaboratory = parseResult.Laboratory,
                    DetectedDate = parseResult.Date
                };
            }

            var label = request.Label ?? $"Импорт из PDF ({parseResult.Date:dd.MM.yyyy})";
            
            var analysis = new Analysis
            {
                Date = parseResult.Date,
                Label = label,
                Laboratory = parseResult.Laboratory,
                Notes = parseResult.DirectionNumber != null 
                    ? $"Направление: {parseResult.DirectionNumber}" 
                    : null,
                Values = parseResult.Values
            };

            var created = await repository.CreateAsync(analysis, ct);
            
            logger.LogInformation(
                "PDF imported successfully. Analysis ID: {Id}, Values count: {Count}", 
                created.Id, 
                parseResult.Values.Count);

            return new ImportPdfResultDto
            {
                Success = true,
                Analysis = mapper.Map<AnalysisDto>(created),
                ParsedValuesCount = parseResult.Values.Count,
                UnrecognizedItems = parseResult.UnrecognizedItems,
                DetectedLaboratory = parseResult.Laboratory,
                DetectedDate = parseResult.Date
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to import PDF");
            return new ImportPdfResultDto
            {
                Success = false,
                ErrorMessage = $"Ошибка при обработке PDF: {ex.Message}"
            };
        }
    }
}
