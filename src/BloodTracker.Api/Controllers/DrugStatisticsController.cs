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
public class DrugStatisticsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Get consumption statistics for a specific drug.
    /// </summary>
    [HttpGet("{drugId:guid}")]
    [ProducesResponseType(typeof(DrugStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DrugStatisticsDto>> GetDrugStatistics(Guid drugId, CancellationToken ct)
    {
        try { return Ok(await mediator.Send(new GetDrugStatisticsQuery(drugId), ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    /// <summary>
    /// Get inventory status for all drugs.
    /// </summary>
    [HttpGet("inventory")]
    [ProducesResponseType(typeof(InventoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<InventoryDto>> GetInventory(CancellationToken ct)
        => Ok(await mediator.Send(new GetInventoryQuery(), ct));

    /// <summary>
    /// Get consumption timeline for a specific drug with optional date range.
    /// </summary>
    [HttpGet("{drugId:guid}/timeline")]
    [ProducesResponseType(typeof(ConsumptionTimelineDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ConsumptionTimelineDto>> GetConsumptionTimeline(
        Guid drugId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetConsumptionTimelineQuery(drugId, startDate, endDate), ct));

    /// <summary>
    /// Get purchase vs consumption comparison for a specific drug.
    /// </summary>
    [HttpGet("{drugId:guid}/purchase-vs-consumption")]
    [ProducesResponseType(typeof(PurchaseVsConsumptionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PurchaseVsConsumptionDto>> GetPurchaseVsConsumption(Guid drugId, CancellationToken ct)
        => Ok(await mediator.Send(new GetPurchaseVsConsumptionQuery(drugId), ct));
}
