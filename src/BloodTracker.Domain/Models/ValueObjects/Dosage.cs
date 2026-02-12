namespace BloodTracker.Domain.Models.ValueObjects;

/// <summary>
/// Value object representing drug dosage with validation.
/// </summary>
public sealed record Dosage
{
    public string Value { get; }
    
    public Dosage(string value) 
        => Value = value?.Trim() ?? throw new ArgumentNullException(nameof(value));
    
    public static implicit operator string(Dosage d) => d.Value;
    public static implicit operator Dosage(string s) => new(s);
    
    public override string ToString() => Value;
}
