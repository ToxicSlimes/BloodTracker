using BloodTracker.Application.Analyses.Commands;
using BloodTracker.Application.Analyses.Dto;
using BloodTracker.Application.Analyses.Queries;
using BloodTracker.Application.Common;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

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
    public async Task<ActionResult<List<IntakeLogDto>>> GetRecent([FromQuery] int count = 10, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetRecentIntakeLogsQuery(count), ct));

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
public class ReferenceRangesController(IReferenceRangeService service) : ControllerBase
{
    [HttpGet]
    public ActionResult GetAll() => Ok(service.GetAllRanges());
}
