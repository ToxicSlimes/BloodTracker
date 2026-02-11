using BloodTracker.Application.Analyses.Commands;
using BloodTracker.Application.Analyses.Dto;
using BloodTracker.Application.Analyses.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Persistence;
using BloodTracker.Infrastructure.Services;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using BloodTracker.Application.Workouts.Commands;
using BloodTracker.Application.Workouts.Dto;
using BloodTracker.Application.Workouts.Queries;

namespace BloodTracker.Api.Controllers;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH CONTROLLER (public endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AuthDbContext authDb,
    IAuthService authService,
    IOptions<AdminSettings> adminSettings,
    IHostEnvironment env,
    ILogger<AuthController> logger) : ControllerBase
{
    public sealed record GoogleLoginRequest(string IdToken);
    public sealed record SendCodeRequest(string Email);
    public sealed record VerifyCodeRequest(string Email, string Code);
    public sealed record AuthResponse(string Token, UserInfo User);
    public sealed record UserInfo(Guid Id, string Email, string? DisplayName);

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(
        [FromBody] GoogleLoginRequest request, CancellationToken ct)
    {
        var result = await authService.VerifyGoogleTokenAsync(request.IdToken, ct);
        if (result is null)
            return Unauthorized(new { error = "Invalid Google token" });

        var (email, googleId, name) = result.Value;
        var user = authDb.Users.FindOne(u => u.Email == email);

        var isAdmin = adminSettings.Value.Emails
            .Contains(email, StringComparer.OrdinalIgnoreCase);

        if (user is null)
        {
            user = new AppUser
            {
                Email = email,
                DisplayName = name,
                GoogleId = googleId,
                IsAdmin = isAdmin,
                LastLoginAt = DateTime.UtcNow
            };
            authDb.Users.Insert(user);
            logger.LogInformation("New user registered via Google: {Email}", email);
        }
        else
        {
            user.GoogleId ??= googleId;
            user.DisplayName ??= name;
            user.IsAdmin = isAdmin;
            user.LastLoginAt = DateTime.UtcNow;
            authDb.Users.Update(user);
        }

        var token = authService.GenerateJwtToken(user);
        return Ok(new AuthResponse(token, new UserInfo(user.Id, user.Email, user.DisplayName)));
    }

    [HttpPost("send-code")]
    public async Task<ActionResult> SendCode(
        [FromBody] SendCodeRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required" });

        var code = authService.GenerateAuthCode();
        var authCode = new AuthCode
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };
        authDb.AuthCodes.Insert(authCode);

        try
        {
            await authService.SendAuthCodeEmailAsync(authCode.Email, code, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send auth code to {Email}", request.Email);
            logger.LogWarning("SMTP unavailable — returning code in response for {Email}", authCode.Email);
            return Ok(new { message = "Code sent", devCode = code });
        }

        // In Development, always include devCode for E2E/integration tests
        if (env.IsDevelopment())
            return Ok(new { message = "Code sent", devCode = code });

        return Ok(new { message = "Code sent" });
    }

    [HttpPost("verify-code")]
    public ActionResult<AuthResponse> VerifyCode([FromBody] VerifyCodeRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var code = authDb.AuthCodes.FindOne(c =>
            c.Email == email &&
            c.Code == request.Code &&
            !c.Used &&
            c.ExpiresAt > DateTime.UtcNow);

        if (code is null)
            return Unauthorized(new { error = "Invalid or expired code" });

        code.Used = true;
        authDb.AuthCodes.Update(code);

        var isAdmin = adminSettings.Value.Emails
            .Contains(email, StringComparer.OrdinalIgnoreCase);

        var user = authDb.Users.FindOne(u => u.Email == email);
        if (user is null)
        {
            user = new AppUser
            {
                Email = email,
                IsAdmin = isAdmin,
                LastLoginAt = DateTime.UtcNow
            };
            authDb.Users.Insert(user);
            logger.LogInformation("New user registered via email code: {Email}", email);
        }
        else
        {
            user.IsAdmin = isAdmin;
            user.LastLoginAt = DateTime.UtcNow;
            authDb.Users.Update(user);
        }

        var token = authService.GenerateJwtToken(user);
        return Ok(new AuthResponse(token, new UserInfo(user.Id, user.Email, user.DisplayName)));
    }

    [HttpGet("config")]
    public ActionResult GetConfig()
    {
        var googleClientId = HttpContext.RequestServices
            .GetRequiredService<Microsoft.Extensions.Options.IOptions<Infrastructure.Services.GoogleAuthSettings>>()
            .Value.ClientId;
        return Ok(new { googleClientId });
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<UserInfo> Me()
    {
        var userContext = HttpContext.RequestServices.GetRequiredService<IUserContext>();
        var user = authDb.Users.FindById(userContext.UserId);
        if (user is null) return NotFound();
        return Ok(new UserInfo(user.Id, user.Email, user.DisplayName));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED CONTROLLERS (require JWT)
// ═══════════════════════════════════════════════════════════════════════════════

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AnalysesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AnalysisDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllAnalysesQuery(), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AnalysisDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetAnalysisByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}/alerts")]
    public async Task<ActionResult<List<AnalysisValueDto>>> GetAlerts(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetAnalysisAlertsQuery(id), ct));

    [HttpGet("compare")]
    public async Task<ActionResult<CompareAnalysesDto>> Compare([FromQuery] Guid beforeId, [FromQuery] Guid afterId, CancellationToken ct)
    {
        var result = await mediator.Send(new CompareAnalysesQuery(beforeId, afterId), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<AnalysisDto>> Create([FromBody] CreateAnalysisDto data, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateAnalysisCommand(data), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AnalysisDto>> Update(Guid id, [FromBody] UpdateAnalysisDto data, CancellationToken ct)
    {
        if (id != data.Id) return BadRequest("ID mismatch");
        return Ok(await mediator.Send(new UpdateAnalysisCommand(data), ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteAnalysisCommand(id), ct) ? NoContent() : NotFound();

    [HttpPost("import-pdf")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ImportPdfResultDto>> ImportPdf(
        IFormFile file,
        [FromForm] string? label,
        CancellationToken ct)
    {
        if (file.Length == 0)
            return BadRequest("Файл пустой");

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Требуется PDF файл");

        await using var stream = file.OpenReadStream();
        var result = await mediator.Send(new ImportPdfAnalysisCommand(stream, label), ct);

        return result.Success ? Ok(result) : BadRequest(result);
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CoursesController(IMediator mediator) : ControllerBase
{
    [HttpGet("active")]
    public async Task<ActionResult<CourseDto>> GetActive(CancellationToken ct)
    {
        var result = await mediator.Send(new GetActiveCourseQuery(), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CourseDto>> Create([FromBody] CreateCourseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateCourseCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CourseDto>> Update(Guid id, [FromBody] CreateCourseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateCourseCommand(id, data), ct));

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> GetDashboard(CancellationToken ct)
        => Ok(await mediator.Send(new GetDashboardQuery(), ct));
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DrugsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DrugDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllDrugsQuery(), ct));

    [HttpPost]
    public async Task<ActionResult<DrugDto>> Create([FromBody] CreateDrugDto data, CancellationToken ct)
    {
        if (!Enum.IsDefined(data.Type))
            return BadRequest(new { error = $"Invalid drug type: {(int)data.Type}" });
        return Ok(await mediator.Send(new CreateDrugCommand(data), ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DrugDto>> Update(Guid id, [FromBody] UpdateDrugDto data, CancellationToken ct)
    {
        if (!Enum.IsDefined(data.Type))
            return BadRequest(new { error = $"Invalid drug type: {(int)data.Type}" });
        return Ok(await mediator.Send(new UpdateDrugCommand(id, data), ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteDrugCommand(id), ct) ? NoContent() : NotFound();
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class IntakeLogsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<IntakeLogDto>>> Get(
        [FromQuery] Guid? drugId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? limit,
        CancellationToken ct = default)
    {
        if (drugId.HasValue || startDate.HasValue || endDate.HasValue || limit.HasValue)
            return Ok(await mediator.Send(new GetIntakeLogsByDrugQuery(drugId, startDate, endDate, limit), ct));

        return Ok(await mediator.Send(new GetRecentIntakeLogsQuery(limit ?? 10), ct));
    }

    [HttpPost]
    public async Task<ActionResult<IntakeLogDto>> Create([FromBody] CreateIntakeLogDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateIntakeLogCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<IntakeLogDto>> Update(Guid id, [FromBody] UpdateIntakeLogDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateIntakeLogCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteIntakeLogCommand(id), ct) ? NoContent() : NotFound();
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PurchasesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PurchaseDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllPurchasesQuery(), ct));

    [HttpGet("by-drug/{drugId:guid}")]
    public async Task<ActionResult<List<PurchaseDto>>> GetByDrug(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetPurchasesByDrugQuery(drugId), ct));

    [HttpPost]
    public async Task<ActionResult<PurchaseDto>> Create([FromBody] CreatePurchaseDto data, CancellationToken ct)
    {
        if (data.Quantity <= 0)
            return BadRequest(new { error = "Quantity must be greater than 0" });
        if (data.Price < 0)
            return BadRequest(new { error = "Price cannot be negative" });
        return Ok(await mediator.Send(new CreatePurchaseCommand(data), ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PurchaseDto>> Update(Guid id, [FromBody] UpdatePurchaseDto data, CancellationToken ct)
    {
        if (data.Quantity <= 0)
            return BadRequest(new { error = "Quantity must be greater than 0" });
        if (data.Price < 0)
            return BadRequest(new { error = "Price cannot be negative" });
        return Ok(await mediator.Send(new UpdatePurchaseCommand(id, data), ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeletePurchaseCommand(id), ct) ? NoContent() : NotFound();

    [HttpGet("options/{drugId:guid}")]
    public async Task<ActionResult<List<PurchaseOptionDto>>> GetOptions(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetPurchaseOptionsQuery(drugId), ct));
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DrugStatisticsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{drugId:guid}")]
    public async Task<ActionResult<DrugStatisticsDto>> GetDrugStatistics(Guid drugId, CancellationToken ct)
    {
        try { return Ok(await mediator.Send(new GetDrugStatisticsQuery(drugId), ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("inventory")]
    public async Task<ActionResult<InventoryDto>> GetInventory(CancellationToken ct)
        => Ok(await mediator.Send(new GetInventoryQuery(), ct));

    [HttpGet("{drugId:guid}/timeline")]
    public async Task<ActionResult<ConsumptionTimelineDto>> GetConsumptionTimeline(
        Guid drugId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetConsumptionTimelineQuery(drugId, startDate, endDate), ct));

    [HttpGet("{drugId:guid}/purchase-vs-consumption")]
    public async Task<ActionResult<PurchaseVsConsumptionDto>> GetPurchaseVsConsumption(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetPurchaseVsConsumptionQuery(drugId), ct));
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReferenceRangesController(IReferenceRangeService service) : ControllerBase
{
    [HttpGet]
    public ActionResult GetAll() => Ok(service.GetAllRanges());
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkoutProgramsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutProgramDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllWorkoutProgramsQuery(), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutProgramDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutProgramByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutProgramDto>> Create([FromBody] CreateWorkoutProgramDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutProgramCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutProgramDto>> Update(Guid id, [FromBody] UpdateWorkoutProgramDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutProgramCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutProgramCommand(id), ct) ? NoContent() : NotFound();
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkoutDaysController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutDayDto>>> GetByProgram([FromQuery] Guid programId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutDaysByProgramQuery(programId), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutDayDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutDayByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutDayDto>> Create([FromBody] CreateWorkoutDayDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutDayCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutDayDto>> Update(Guid id, [FromBody] UpdateWorkoutDayDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutDayCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutDayCommand(id), ct) ? NoContent() : NotFound();
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkoutExercisesController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutExerciseDto>>> GetAll(
        [FromQuery] Guid? programId,
        [FromQuery] Guid? dayId,
        CancellationToken ct)
    {
        if (dayId.HasValue)
            return Ok(await mediator.Send(new GetWorkoutExercisesByDayQuery(dayId.Value), ct));

        if (programId.HasValue)
            return Ok(await mediator.Send(new GetWorkoutExercisesByProgramQuery(programId.Value), ct));

        return BadRequest("programId or dayId is required");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutExerciseDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutExerciseByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutExerciseDto>> Create([FromBody] CreateWorkoutExerciseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutExerciseCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutExerciseDto>> Update(Guid id, [FromBody] UpdateWorkoutExerciseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutExerciseCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutExerciseCommand(id), ct) ? NoContent() : NotFound();
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkoutSetsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<WorkoutSetDto>>> GetByExercise([FromQuery] Guid exerciseId, CancellationToken ct)
        => Ok(await mediator.Send(new GetWorkoutSetsByExerciseQuery(exerciseId), ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutSetDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWorkoutSetByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutSetDto>> Create([FromBody] CreateWorkoutSetDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateWorkoutSetCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutSetDto>> Update(Guid id, [FromBody] UpdateWorkoutSetDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateWorkoutSetCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteWorkoutSetCommand(id), ct) ? NoContent() : NotFound();
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExerciseCatalogController(IExerciseCatalogService catalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ExerciseCatalogEntry>>> GetAll(
        [FromQuery] MuscleGroup? muscleGroup,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var catalog = await catalogService.GetCatalogAsync(ct);

        var filtered = catalog.AsEnumerable();

        if (muscleGroup.HasValue)
        {
            filtered = filtered.Where(e => e.MuscleGroup == muscleGroup.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            filtered = filtered.Where(e =>
                e.Name.Contains(searchLower, StringComparison.OrdinalIgnoreCase) ||
                (e.BodyPart != null && e.BodyPart.Contains(searchLower, StringComparison.OrdinalIgnoreCase)) ||
                (e.Target != null && e.Target.Contains(searchLower, StringComparison.OrdinalIgnoreCase)) ||
                (e.Equipment != null && e.Equipment.Contains(searchLower, StringComparison.OrdinalIgnoreCase)));
        }

        return Ok(filtered.ToList());
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRUG CATALOG CONTROLLER (public reference data)
// ═══════════════════════════════════════════════════════════════════════════════

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DrugCatalogController(IDrugCatalogService catalogService) : ControllerBase
{
    [HttpGet("substances")]
    public ActionResult<List<DrugCatalogItem>> GetSubstances(
        [FromQuery] DrugCategory? category,
        [FromQuery] DrugSubcategory? subcategory,
        [FromQuery] DrugType? drugType,
        [FromQuery] string? search)
        => Ok(catalogService.Search(search, category, subcategory, drugType));

    [HttpGet("substances/popular")]
    public ActionResult<List<DrugCatalogItem>> GetPopular()
        => Ok(catalogService.GetPopular());

    [HttpGet("substances/{id}")]
    public ActionResult<DrugCatalogItem> GetSubstance(string id)
    {
        var item = catalogService.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("manufacturers")]
    public ActionResult<List<Manufacturer>> GetManufacturers(
        [FromQuery] ManufacturerType? type,
        [FromQuery] string? search)
        => Ok(catalogService.SearchManufacturers(search, type));

    [HttpGet("manufacturers/{id}")]
    public ActionResult<Manufacturer> GetManufacturer(string id)
    {
        var mfr = catalogService.GetManufacturerById(id);
        return mfr is null ? NotFound() : Ok(mfr);
    }

    [HttpGet("categories")]
    public ActionResult GetCategories()
    {
        var categories = Enum.GetValues<DrugCategory>()
            .Select(c => new { value = (int)c, name = c.ToString() })
            .ToList();
        return Ok(categories);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CONTROLLER (admin-only endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

[Authorize(Policy = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class AdminController(
    AuthDbContext authDb,
    IAuthService authService,
    IOptions<DatabaseSettings> dbSettings,
    ILogger<AdminController> logger) : ControllerBase
{
    public sealed record AdminUserDto(
        Guid Id, string Email, string? DisplayName, bool IsAdmin,
        DateTime CreatedAt, DateTime? LastLoginAt,
        int AnalysesCount, int CoursesCount, int DrugsCount, int WorkoutsCount);

    public sealed record AdminUserSummaryDto(
        Guid Id, string Email, string? DisplayName, bool IsAdmin,
        DateTime CreatedAt, DateTime? LastLoginAt,
        List<AdminAnalysisBrief> Analyses, AdminCourseBrief? ActiveCourse,
        int DrugCount, int WorkoutProgramCount, long DbSizeBytes);

    public sealed record AdminAnalysisBrief(Guid Id, DateTime Date, string Label);
    public sealed record AdminCourseBrief(string Title, DateTime? StartDate, DateTime? EndDate, bool IsActive);

    public sealed record AdminStatsDto(
        int TotalUsers, long TotalDbSizeBytes, int ActiveUsersLast7Days,
        int TotalAnalyses, int TotalCourses, int TotalWorkouts,
        List<RegistrationDay> RecentRegistrations);

    public sealed record RegistrationDay(string Date, int Count);
    public sealed record UpdateRoleRequest(bool IsAdmin);
    public sealed record ImpersonateResponse(string Token, string Email, string? DisplayName);

    private string GetDbDir()
    {
        var connStr = dbSettings.Value.ConnectionString;
        var filename = connStr.Replace("Filename=", "").Split(';')[0];
        return Path.GetDirectoryName(Path.GetFullPath(filename)) ?? ".";
    }

    private string GetUserDbPath(Guid userId)
        => Path.Combine(GetDbDir(), $"user_{userId}.db");

    [HttpGet("users")]
    public ActionResult<List<AdminUserDto>> GetUsers()
    {
        var users = authDb.Users.FindAll().ToList();
        var result = new List<AdminUserDto>();

        foreach (var u in users)
        {
            var dbPath = GetUserDbPath(u.Id);
            int analyses = 0, courses = 0, drugs = 0, workouts = 0;

            if (System.IO.File.Exists(dbPath))
            {
                try
                {
                    using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                    analyses = db.Analyses.Count();
                    courses = db.Courses.Count();
                    drugs = db.Drugs.Count();
                    workouts = db.WorkoutPrograms.Count();
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to read user DB for {UserId}", u.Id);
                }
            }

            result.Add(new AdminUserDto(
                u.Id, u.Email, u.DisplayName, u.IsAdmin,
                u.CreatedAt, u.LastLoginAt,
                analyses, courses, drugs, workouts));
        }

        return Ok(result.OrderByDescending(u => u.CreatedAt).ToList());
    }

    [HttpGet("users/{id:guid}/summary")]
    public ActionResult<AdminUserSummaryDto> GetUserSummary(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        var dbPath = GetUserDbPath(id);
        var analyses = new List<AdminAnalysisBrief>();
        AdminCourseBrief? activeCourse = null;
        int drugCount = 0, workoutCount = 0;
        long dbSize = 0;

        if (System.IO.File.Exists(dbPath))
        {
            dbSize = new FileInfo(dbPath).Length;
            try
            {
                using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                analyses = db.Analyses.FindAll()
                    .OrderByDescending(a => a.Date)
                    .Select(a => new AdminAnalysisBrief(a.Id, a.Date, a.Label))
                    .ToList();
                var course = db.Courses.FindOne(c => c.IsActive);
                if (course is not null)
                    activeCourse = new AdminCourseBrief(course.Title, course.StartDate, course.EndDate, course.IsActive);
                drugCount = db.Drugs.Count();
                workoutCount = db.WorkoutPrograms.Count();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read user DB for summary {UserId}", id);
            }
        }

        return Ok(new AdminUserSummaryDto(
            user.Id, user.Email, user.DisplayName, user.IsAdmin,
            user.CreatedAt, user.LastLoginAt,
            analyses, activeCourse, drugCount, workoutCount, dbSize));
    }

    [HttpGet("stats")]
    public ActionResult<AdminStatsDto> GetStats()
    {
        var users = authDb.Users.FindAll().ToList();
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        int activeRecent = users.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= sevenDaysAgo);
        long totalDbSize = 0;
        int totalAnalyses = 0, totalCourses = 0, totalWorkouts = 0;

        foreach (var u in users)
        {
            var dbPath = GetUserDbPath(u.Id);
            if (System.IO.File.Exists(dbPath))
            {
                totalDbSize += new FileInfo(dbPath).Length;
                try
                {
                    using var db = new BloodTrackerDbContext($"Filename={dbPath};Connection=shared");
                    totalAnalyses += db.Analyses.Count();
                    totalCourses += db.Courses.Count();
                    totalWorkouts += db.WorkoutPrograms.Count();
                }
                catch { }
            }
        }

        // Add auth.db size
        var authDbPath = Path.Combine(GetDbDir(), "auth.db");
        if (System.IO.File.Exists(authDbPath))
            totalDbSize += new FileInfo(authDbPath).Length;

        // Registrations by day (last 30 days)
        var thirtyDaysAgo = now.AddDays(-30);
        var recentRegs = users
            .Where(u => u.CreatedAt >= thirtyDaysAgo)
            .GroupBy(u => u.CreatedAt.ToString("yyyy-MM-dd"))
            .Select(g => new RegistrationDay(g.Key, g.Count()))
            .OrderBy(r => r.Date)
            .ToList();

        return Ok(new AdminStatsDto(
            users.Count, totalDbSize, activeRecent,
            totalAnalyses, totalCourses, totalWorkouts,
            recentRegs));
    }

    [HttpPut("users/{id:guid}/role")]
    public ActionResult UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        user.IsAdmin = request.IsAdmin;
        authDb.Users.Update(user);

        logger.LogInformation("Admin toggled role for {Email}: IsAdmin={IsAdmin}", user.Email, request.IsAdmin);
        return Ok(new { user.Email, user.IsAdmin });
    }

    [HttpDelete("users/{id:guid}")]
    public ActionResult DeleteUser(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        // Delete user DB file
        var dbPath = GetUserDbPath(id);
        if (System.IO.File.Exists(dbPath))
        {
            try { System.IO.File.Delete(dbPath); }
            catch (Exception ex) { logger.LogWarning(ex, "Failed to delete user DB file: {Path}", dbPath); }
        }

        // Remove from auth DB
        authDb.Users.Delete(id);
        authDb.AuthCodes.DeleteMany(c => c.Email == user.Email);

        logger.LogInformation("Admin deleted user {Email} ({UserId})", user.Email, id);
        return NoContent();
    }

    [HttpGet("impersonate/{id:guid}")]
    public ActionResult<ImpersonateResponse> Impersonate(Guid id)
    {
        var user = authDb.Users.FindById(id);
        if (user is null) return NotFound();

        var token = authService.GenerateImpersonationToken(user);
        logger.LogInformation("Admin impersonating user {Email} ({UserId})", user.Email, id);

        return Ok(new ImpersonateResponse(token, user.Email, user.DisplayName));
    }
}
