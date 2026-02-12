namespace BloodTracker.Domain.Models.ValueObjects;

// TODO: Apply to entity properties after adding LiteDB custom serializer
/// <summary>
/// Value object representing a date range with validation.
/// </summary>
public sealed record DateRange
{
    public DateTime Start { get; }
    public DateTime End { get; }
    
    public DateRange(DateTime start, DateTime end)
    {
        if (end < start) 
            throw new ArgumentException("End date must be >= start date");
        Start = start;
        End = end;
    }
    
    public int TotalDays => (End - Start).Days + 1;
    public int CurrentDay => Math.Max(0, (DateTime.Today - Start).Days + 1);
    
    public override string ToString() => $"{Start:yyyy-MM-dd} to {End:yyyy-MM-dd}";
}
