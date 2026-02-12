using BloodTracker.Application.Common;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class ReferenceRangesController(IReferenceRangeService service) : ControllerBase
{
    /// <summary>
    /// Get all blood test reference ranges.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetAll() => Ok(service.GetAllRanges());
}
