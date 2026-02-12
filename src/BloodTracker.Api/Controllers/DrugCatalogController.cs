using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class DrugCatalogController(IDrugCatalogService catalogService) : ControllerBase
{
    /// <summary>
    /// Search drug substances with optional filters.
    /// </summary>
    [HttpGet("substances")]
    [ProducesResponseType(typeof(List<DrugCatalogItem>), StatusCodes.Status200OK)]
    public ActionResult<List<DrugCatalogItem>> GetSubstances(
        [FromQuery] DrugCategory? category,
        [FromQuery] DrugSubcategory? subcategory,
        [FromQuery] DrugType? drugType,
        [FromQuery] string? search)
        => Ok(catalogService.Search(search, category, subcategory, drugType));

    /// <summary>
    /// Get popular drug substances.
    /// </summary>
    [HttpGet("substances/popular")]
    [ProducesResponseType(typeof(List<DrugCatalogItem>), StatusCodes.Status200OK)]
    public ActionResult<List<DrugCatalogItem>> GetPopular()
        => Ok(catalogService.GetPopular());

    /// <summary>
    /// Get a specific drug substance by ID.
    /// </summary>
    [HttpGet("substances/{id}")]
    [ProducesResponseType(typeof(DrugCatalogItem), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<DrugCatalogItem> GetSubstance(string id)
    {
        var item = catalogService.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Search manufacturers with optional filters.
    /// </summary>
    [HttpGet("manufacturers")]
    [ProducesResponseType(typeof(List<Manufacturer>), StatusCodes.Status200OK)]
    public ActionResult<List<Manufacturer>> GetManufacturers(
        [FromQuery] ManufacturerType? type,
        [FromQuery] string? search)
        => Ok(catalogService.SearchManufacturers(search, type));

    /// <summary>
    /// Get a specific manufacturer by ID.
    /// </summary>
    [HttpGet("manufacturers/{id}")]
    [ProducesResponseType(typeof(Manufacturer), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Manufacturer> GetManufacturer(string id)
    {
        var mfr = catalogService.GetManufacturerById(id);
        return mfr is null ? NotFound() : Ok(mfr);
    }

    /// <summary>
    /// Get all drug categories.
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetCategories()
    {
        var categories = Enum.GetValues<DrugCategory>()
            .Select(c => new { value = (int)c, name = c.ToString() })
            .ToList();
        return Ok(categories);
    }
}
