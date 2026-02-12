namespace BloodTracker.Domain.Models.ValueObjects;

/// <summary>
/// Value object representing money amount with non-negative constraint.
/// </summary>
public sealed record Money
{
    public decimal Amount { get; }
    
    public Money(decimal amount)
    {
        if (amount < 0) 
            throw new ArgumentOutOfRangeException(nameof(amount), "Cannot be negative");
        Amount = amount;
    }
    
    public static implicit operator decimal(Money m) => m.Amount;
    public static implicit operator Money(decimal d) => new(d);
    
    public override string ToString() => Amount.ToString("F2");
}
