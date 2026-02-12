namespace BloodTracker.Domain.Models;

/// <summary>
/// Покупка препарата
/// </summary>
public sealed class Purchase : Entity
{
    public required Guid DrugId { get; set; }
    public required string DrugName { get; set; }
    public required DateTime PurchaseDate { get; set; }
    public required int Quantity { get; set; }
    public decimal Price { get; set; }
    public string? Vendor { get; set; }
    public string? Notes { get; set; }
    public string? ManufacturerId { get; set; }
    public string? ManufacturerName { get; set; }
}
