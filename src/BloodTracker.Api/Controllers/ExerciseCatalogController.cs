using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class ExerciseCatalogController(IExerciseCatalogService catalogService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(List<ExerciseCatalogEntry>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ExerciseCatalogEntry>>> GetAll(
        [FromQuery] MuscleGroup? muscleGroup,
        [FromQuery] string? search,
        [FromQuery] string? equipment,
        [FromQuery] string? category,
        [FromQuery] string? exerciseType,
        CancellationToken ct)
    {
        var catalog = await catalogService.GetCatalogAsync(ct);

        var filtered = catalog.AsEnumerable();

        if (muscleGroup.HasValue)
        {
            filtered = filtered.Where(e =>
                e.MuscleGroup == muscleGroup.Value ||
                e.SecondaryMuscles.Contains(muscleGroup.Value));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            filtered = filtered.Where(e =>
                e.NameRu.Contains(searchLower, StringComparison.OrdinalIgnoreCase) ||
                e.NameEn.Contains(searchLower, StringComparison.OrdinalIgnoreCase) ||
                (e.BodyPart != null && e.BodyPart.Contains(searchLower, StringComparison.OrdinalIgnoreCase)) ||
                (e.Target != null && e.Target.Contains(searchLower, StringComparison.OrdinalIgnoreCase)) ||
                (e.Equipment != null && e.Equipment.Contains(searchLower, StringComparison.OrdinalIgnoreCase)));
        }

        if (!string.IsNullOrWhiteSpace(equipment))
        {
            filtered = filtered.Where(e =>
                e.Equipment != null && e.Equipment.Equals(equipment, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            filtered = filtered.Where(e =>
                e.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(exerciseType))
        {
            filtered = filtered.Where(e =>
                e.ExerciseType.Equals(exerciseType, StringComparison.OrdinalIgnoreCase));
        }

        return Ok(filtered.ToList());
    }
}
