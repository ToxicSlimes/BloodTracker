using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExerciseCatalogController(IExerciseCatalogService catalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ExerciseCatalogEntry>>> GetAll(
        [FromQuery] MuscleGroup? muscleGroup,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var catalog = await catalogService.GetCatalogAsync(ct);

        var filtered = catalog.AsEnumerable();

        if (muscleGroup.HasValue)
        {
            filtered = filtered.Where(e => e.MuscleGroup == muscleGroup.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            filtered = filtered.Where(e =>
                e.Name.Contains(searchLower, StringComparison.OrdinalIgnoreCase) ||
                (e.BodyPart != null && e.BodyPart.Contains(searchLower, StringComparison.OrdinalIgnoreCase)) ||
                (e.Target != null && e.Target.Contains(searchLower, StringComparison.OrdinalIgnoreCase)) ||
                (e.Equipment != null && e.Equipment.Contains(searchLower, StringComparison.OrdinalIgnoreCase)));
        }

        return Ok(filtered.ToList());
    }
}
