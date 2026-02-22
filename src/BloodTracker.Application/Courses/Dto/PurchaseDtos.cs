using BloodTracker.Domain.Models;

namespace BloodTracker.Application.Courses.Dto;

public sealed record PurchaseDto
{
    public Guid Id { get; init; }
    public Guid DrugId { get; init; }
    public required string DrugName { get; init; }
    public DateTime PurchaseDate { get; init; }
    public int Quantity { get; init; }
    public decimal Price { get; init; }
    public string? Vendor { get; init; }
    public string? Notes { get; init; }
    public string? ManufacturerId { get; init; }
    public string? ManufacturerName { get; init; }
    public double? TotalAmount { get; init; }
    public DoseUnit? AmountUnit { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed record CreatePurchaseDto
{
    public required Guid DrugId { get; init; }
    public required DateTime PurchaseDate { get; init; }
    public required int Quantity { get; init; }
    public decimal Price { get; init; }
    public string? Vendor { get; init; }
    public string? Notes { get; init; }
    public string? ManufacturerId { get; init; }
    public double? TotalAmount { get; init; }
    public DoseUnit? AmountUnit { get; init; }
}

public sealed record UpdatePurchaseDto
{
    public required Guid DrugId { get; init; }
    public required DateTime PurchaseDate { get; init; }
    public required int Quantity { get; init; }
    public decimal Price { get; init; }
    public string? Vendor { get; init; }
    public string? Notes { get; init; }
    public string? ManufacturerId { get; init; }
    public double? TotalAmount { get; init; }
    public DoseUnit? AmountUnit { get; init; }
}

public sealed record DrugStatisticsDto
{
    public Guid DrugId { get; init; }
    public required string DrugName { get; init; }
    public int TotalConsumed { get; init; }
    public int TotalPurchased { get; init; }
    public int CurrentStock { get; init; }
    public decimal TotalSpent { get; init; }
}

public sealed record PurchaseOptionDto
{
    public Guid Id { get; init; }
    public required string Label { get; init; }
    public int RemainingStock { get; init; }
}

public sealed record InventoryItemDto
{
    public Guid DrugId { get; init; }
    public required string DrugName { get; init; }
    public int TotalPurchased { get; init; }
    public int TotalConsumed { get; init; }
    public int CurrentStock { get; init; }
    public decimal TotalSpent { get; init; }
    public DateTime? LastPurchaseDate { get; init; }
    public DateTime? LastIntakeDate { get; init; }
    public List<PerPurchaseStockDto> PurchaseBreakdown { get; init; } = [];
    public int UnallocatedConsumed { get; init; }
    public double? TotalAmountStructured { get; init; }
    public double? ConsumedAmountStructured { get; init; }
    public double? RemainingAmountStructured { get; init; }
    public DoseUnit? AmountUnit { get; init; }
}

public sealed record PerPurchaseStockDto
{
    public Guid PurchaseId { get; init; }
    public required string Label { get; init; }
    public int Purchased { get; init; }
    public int Consumed { get; init; }
    public int Remaining { get; init; }
    public double? TotalAmountStructured { get; init; }
    public double? ConsumedAmountStructured { get; init; }
    public double? RemainingAmountStructured { get; init; }
    public DoseUnit? AmountUnit { get; init; }
}

public sealed record InventoryDto
{
    public List<InventoryItemDto> Items { get; init; } = [];
    public int TotalDrugs { get; init; }
    public decimal TotalSpent { get; init; }
}

public sealed record ConsumptionTimelineDto
{
    public List<ConsumptionDataPointDto> DataPoints { get; init; } = [];
}

public sealed record ConsumptionDataPointDto
{
    public DateTime Date { get; init; }
    public int Count { get; init; }
}

public sealed record PurchaseVsConsumptionDto
{
    public List<TimelinePointDto> Timeline { get; init; } = [];
}

public sealed record TimelinePointDto
{
    public DateTime Date { get; init; }
    public int Purchases { get; init; }
    public int Consumption { get; init; }
    public int RunningStock { get; init; }
}
