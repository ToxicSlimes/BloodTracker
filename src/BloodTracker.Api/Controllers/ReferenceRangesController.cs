using BloodTracker.Application.Common;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReferenceRangesController(IReferenceRangeService service) : ControllerBase
{
    [HttpGet]
    public ActionResult GetAll() => Ok(service.GetAllRanges());
}
