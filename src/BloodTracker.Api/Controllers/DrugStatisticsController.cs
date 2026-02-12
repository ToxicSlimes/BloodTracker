using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

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
