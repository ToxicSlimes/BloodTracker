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
