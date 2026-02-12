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
