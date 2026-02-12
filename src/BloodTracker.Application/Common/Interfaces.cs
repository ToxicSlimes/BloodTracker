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
    Task<List<IntakeLog>> GetByDrugIdAsync(Guid drugId, CancellationToken ct = default);
    Task<IntakeLog?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IntakeLog> CreateAsync(IntakeLog log, CancellationToken ct = default);
    Task<IntakeLog> UpdateAsync(IntakeLog log, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> DeleteByDrugIdAsync(Guid drugId, CancellationToken ct = default);
}

public interface IPurchaseRepository
{
    Task<List<Purchase>> GetAllAsync(CancellationToken ct = default);
    Task<List<Purchase>> GetByDrugIdAsync(Guid drugId, CancellationToken ct = default);
    Task<Purchase?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Purchase> CreateAsync(Purchase purchase, CancellationToken ct = default);
    Task<Purchase> UpdateAsync(Purchase purchase, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IWorkoutProgramRepository
{
    Task<List<WorkoutProgram>> GetAllAsync(CancellationToken ct = default);
    Task<WorkoutProgram?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<WorkoutProgram> CreateAsync(WorkoutProgram program, CancellationToken ct = default);
    Task<WorkoutProgram> UpdateAsync(WorkoutProgram program, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IWorkoutDayRepository
{
    Task<List<WorkoutDay>> GetByProgramIdAsync(Guid programId, CancellationToken ct = default);
    Task<WorkoutDay?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<WorkoutDay> CreateAsync(WorkoutDay day, CancellationToken ct = default);
    Task<WorkoutDay> UpdateAsync(WorkoutDay day, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IWorkoutExerciseRepository
{
    Task<List<WorkoutExercise>> GetByProgramIdAsync(Guid programId, CancellationToken ct = default);
    Task<List<WorkoutExercise>> GetByDayIdAsync(Guid dayId, CancellationToken ct = default);
    Task<WorkoutExercise?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<WorkoutExercise> CreateAsync(WorkoutExercise exercise, CancellationToken ct = default);
    Task<WorkoutExercise> UpdateAsync(WorkoutExercise exercise, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IWorkoutSetRepository
{
    Task<List<WorkoutSet>> GetByExerciseIdAsync(Guid exerciseId, CancellationToken ct = default);
    Task<WorkoutSet?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<WorkoutSet> CreateAsync(WorkoutSet set, CancellationToken ct = default);
    Task<WorkoutSet> UpdateAsync(WorkoutSet set, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IUserContext
{
    Guid UserId { get; }
    string Email { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
}

public interface IAuthService
{
    string GenerateJwtToken(AppUser user);
    string GenerateImpersonationToken(AppUser targetUser);
    Task<(string Email, string GoogleId, string? Name)?> VerifyGoogleTokenAsync(string idToken, CancellationToken ct = default);
    string GenerateAuthCode();
    Task SendAuthCodeEmailAsync(string email, string code, CancellationToken ct = default);
}

public interface IReferenceRangeService
{
    ReferenceRange? GetRange(string key);
    IReadOnlyList<ReferenceRange> GetAllRanges();
    ValueStatus GetStatus(string key, double value);
}

public interface IDrugCatalogService
{
    List<DrugCatalogItem> GetAll();
    List<DrugCatalogItem> Search(string? query, DrugCategory? category, DrugSubcategory? subcategory, DrugType? drugType);
    DrugCatalogItem? GetById(string id);
    List<DrugCatalogItem> GetPopular();
    List<Manufacturer> GetAllManufacturers();
    List<Manufacturer> SearchManufacturers(string? query, ManufacturerType? type);
    Manufacturer? GetManufacturerById(string id);
}

public interface IExerciseCatalogService
{
    Task<IReadOnlyList<ExerciseCatalogEntry>> GetCatalogAsync(CancellationToken ct = default);
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
