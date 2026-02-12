using BloodTracker.Application.Common;
using BloodTracker.Domain.Models;
using BloodTracker.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DrugCatalogController(IDrugCatalogService catalogService) : ControllerBase
{
    [HttpGet("substances")]
    public ActionResult<List<DrugCatalogItem>> GetSubstances(
        [FromQuery] DrugCategory? category,
        [FromQuery] DrugSubcategory? subcategory,
        [FromQuery] DrugType? drugType,
        [FromQuery] string? search)
        => Ok(catalogService.Search(search, category, subcategory, drugType));

    [HttpGet("substances/popular")]
    public ActionResult<List<DrugCatalogItem>> GetPopular()
        => Ok(catalogService.GetPopular());

    [HttpGet("substances/{id}")]
    public ActionResult<DrugCatalogItem> GetSubstance(string id)
    {
        var item = catalogService.GetById(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("manufacturers")]
    public ActionResult<List<Manufacturer>> GetManufacturers(
        [FromQuery] ManufacturerType? type,
        [FromQuery] string? search)
        => Ok(catalogService.SearchManufacturers(search, type));

    [HttpGet("manufacturers/{id}")]
    public ActionResult<Manufacturer> GetManufacturer(string id)
    {
        var mfr = catalogService.GetManufacturerById(id);
        return mfr is null ? NotFound() : Ok(mfr);
    }

    [HttpGet("categories")]
    public ActionResult GetCategories()
    {
        var categories = Enum.GetValues<DrugCategory>()
            .Select(c => new { value = (int)c, name = c.ToString() })
            .ToList();
        return Ok(categories);
    }
}
