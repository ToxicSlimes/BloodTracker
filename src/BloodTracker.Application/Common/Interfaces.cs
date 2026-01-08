using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Common;

public interface IAnalysisRepository
{
    Task<List<Analysis>> GetAllAsync(CancellationToken ct = default);
    Task<Analysis?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Analysis> CreateAsync(Analysis analysis, CancellationToken ct = default);
    Task<Analysis> UpdateAsync(Analysis analysis, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface ICourseRepository
{
    Task<List<Course>> GetAllAsync(CancellationToken ct = default);
    Task<Course?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Course?> GetActiveAsync(CancellationToken ct = default);
    Task<Course> CreateAsync(Course course, CancellationToken ct = default);
    Task<Course> UpdateAsync(Course course, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IDrugRepository
{
    Task<List<Drug>> GetAllAsync(CancellationToken ct = default);
    Task<List<Drug>> GetByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<Drug?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Drug> CreateAsync(Drug drug, CancellationToken ct = default);
    Task<Drug> UpdateAsync(Drug drug, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IIntakeLogRepository
{
    Task<List<IntakeLog>> GetAllAsync(CancellationToken ct = default);
    Task<List<IntakeLog>> GetRecentAsync(int count, CancellationToken ct = default);
    Task<IntakeLog?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IntakeLog> CreateAsync(IntakeLog log, CancellationToken ct = default);
    Task<IntakeLog> UpdateAsync(IntakeLog log, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IReferenceRangeService
{
    ReferenceRange? GetRange(string key);
    IReadOnlyList<ReferenceRange> GetAllRanges();
    ValueStatus GetStatus(string key, double value);
}

public sealed record PdfAnalysisResult
{
    public DateTime Date { get; set; }
    public string? Laboratory { get; set; }
    public string? PatientName { get; set; }
    public string? DirectionNumber { get; set; }
    public Dictionary<string, double> Values { get; init; } = new();
    public List<string> UnrecognizedItems { get; init; } = new();
}

public interface IPdfParserService
{
    Task<PdfAnalysisResult> ParseAnalysisPdfAsync(Stream pdfStream, CancellationToken ct = default);
}
