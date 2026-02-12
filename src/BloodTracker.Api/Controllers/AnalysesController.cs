using BloodTracker.Application.Analyses.Commands;
using BloodTracker.Application.Analyses.Dto;
using BloodTracker.Application.Analyses.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

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
