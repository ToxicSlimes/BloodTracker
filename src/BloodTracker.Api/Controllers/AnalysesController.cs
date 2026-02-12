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
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class AnalysesController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get all blood analyses for the current user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<AnalysisDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<AnalysisDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllAnalysesQuery(), ct));

    /// <summary>
    /// Get a specific blood analysis by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AnalysisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnalysisDto>> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetAnalysisByIdQuery(id), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Get alerts (out-of-range values) for a specific analysis.
    /// </summary>
    [HttpGet("{id:guid}/alerts")]
    [ProducesResponseType(typeof(List<AnalysisValueDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<AnalysisValueDto>>> GetAlerts(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetAnalysisAlertsQuery(id), ct));

    /// <summary>
    /// Compare two analyses and get the differences.
    /// </summary>
    [HttpGet("compare")]
    [ProducesResponseType(typeof(CompareAnalysesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CompareAnalysesDto>> Compare([FromQuery] Guid beforeId, [FromQuery] Guid afterId, CancellationToken ct)
    {
        var result = await mediator.Send(new CompareAnalysesQuery(beforeId, afterId), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new blood analysis.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AnalysisDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AnalysisDto>> Create([FromBody] CreateAnalysisDto data, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateAnalysisCommand(data), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Update an existing blood analysis.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AnalysisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AnalysisDto>> Update(Guid id, [FromBody] UpdateAnalysisDto data, CancellationToken ct)
    {
        if (id != data.Id) return BadRequest("ID mismatch");
        return Ok(await mediator.Send(new UpdateAnalysisCommand(data), ct));
    }

    /// <summary>
    /// Delete a blood analysis.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteAnalysisCommand(id), ct) ? NoContent() : NotFound();

    /// <summary>
    /// Import blood analysis from a PDF file.
    /// </summary>
    [HttpPost("import-pdf")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ImportPdfResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
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
