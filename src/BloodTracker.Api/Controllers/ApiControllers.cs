using BloodTracker.Application.Analyses.Commands;
using BloodTracker.Application.Analyses.Dto;
using BloodTracker.Application.Analyses.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using BloodTracker.Application.Workouts.Commands;
using BloodTracker.Application.Workouts.Dto;
using BloodTracker.Application.Workouts.Queries;
using BloodTracker.Domain.Models;

namespace BloodTracker.Api.Controllers;

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

[ApiController]
[Route("api/[controller]")]
public class DrugsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DrugDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllDrugsQuery(), ct));

    [HttpPost]
    public async Task<ActionResult<DrugDto>> Create([FromBody] CreateDrugDto data, CancellationToken ct)
        => Ok(await mediator.Send(new CreateDrugCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DrugDto>> Update(Guid id, [FromBody] UpdateDrugDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateDrugCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteDrugCommand(id), ct) ? NoContent() : NotFound();
}

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
        => Ok(await mediator.Send(new CreatePurchaseCommand(data), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PurchaseDto>> Update(Guid id, [FromBody] UpdatePurchaseDto data, CancellationToken ct)
        => Ok(await mediator.Send(new UpdatePurchaseCommand(id, data), ct));

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeletePurchaseCommand(id), ct) ? NoContent() : NotFound();
}

[ApiController]
[Route("api/[controller]")]
public class DrugStatisticsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{drugId:guid}")]
    public async Task<ActionResult<DrugStatisticsDto>> GetDrugStatistics(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetDrugStatisticsQuery(drugId), ct));

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

[ApiController]
[Route("api/[controller]")]
public class ReferenceRangesController(IReferenceRangeService service) : ControllerBase
{
    [HttpGet]
    public ActionResult GetAll() => Ok(service.GetAllRanges());
}

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