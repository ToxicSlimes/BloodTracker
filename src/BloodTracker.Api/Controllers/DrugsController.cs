using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class DrugsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get all drugs/supplements for the current user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<DrugDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<DrugDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllDrugsQuery(), ct));

    /// <summary>
    /// Create a new drug/supplement.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(DrugDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DrugDto>> Create([FromBody] CreateDrugDto data, CancellationToken ct)
    {
        if (!Enum.IsDefined(data.Type))
            return BadRequest(new { error = $"Invalid drug type: {(int)data.Type}" });
        return Ok(await mediator.Send(new CreateDrugCommand(data), ct));
    }

    /// <summary>
    /// Update an existing drug/supplement.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(DrugDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DrugDto>> Update(Guid id, [FromBody] UpdateDrugDto data, CancellationToken ct)
    {
        if (!Enum.IsDefined(data.Type))
            return BadRequest(new { error = $"Invalid drug type: {(int)data.Type}" });
        return Ok(await mediator.Send(new UpdateDrugCommand(id, data), ct));
    }

    /// <summary>
    /// Delete a drug/supplement.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeleteDrugCommand(id), ct) ? NoContent() : NotFound();
}
