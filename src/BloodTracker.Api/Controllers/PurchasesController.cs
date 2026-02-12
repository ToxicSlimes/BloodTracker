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
public class PurchasesController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get all purchases for the current user.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PurchaseDto>>> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllPurchasesQuery(), ct));

    /// <summary>
    /// Get all purchases for a specific drug.
    /// </summary>
    [HttpGet("by-drug/{drugId:guid}")]
    [ProducesResponseType(typeof(List<PurchaseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PurchaseDto>>> GetByDrug(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetPurchasesByDrugQuery(drugId), ct));

    /// <summary>
    /// Create a new purchase record.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PurchaseDto>> Create([FromBody] CreatePurchaseDto data, CancellationToken ct)
    {
        if (data.Quantity <= 0)
            return BadRequest(new { error = "Quantity must be greater than 0" });
        if (data.Price < 0)
            return BadRequest(new { error = "Price cannot be negative" });
        return Ok(await mediator.Send(new CreatePurchaseCommand(data), ct));
    }

    /// <summary>
    /// Update an existing purchase record.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PurchaseDto>> Update(Guid id, [FromBody] UpdatePurchaseDto data, CancellationToken ct)
    {
        if (data.Quantity <= 0)
            return BadRequest(new { error = "Quantity must be greater than 0" });
        if (data.Price < 0)
            return BadRequest(new { error = "Price cannot be negative" });
        return Ok(await mediator.Send(new UpdatePurchaseCommand(id, data), ct));
    }

    /// <summary>
    /// Delete a purchase record.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
        => await mediator.Send(new DeletePurchaseCommand(id), ct) ? NoContent() : NotFound();

    /// <summary>
    /// Get purchase options for a specific drug.
    /// </summary>
    [HttpGet("options/{drugId:guid}")]
    [ProducesResponseType(typeof(List<PurchaseOptionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PurchaseOptionDto>>> GetOptions(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetPurchaseOptionsQuery(drugId), ct));
}
