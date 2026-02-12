namespace BloodTracker.Domain.Events;

/// <summary>
/// Marker interface for domain events.
/// TODO: Wire up MediatR notification dispatch in SaveChanges/repository.
/// </summary>
public interface IDomainEvent
{
    DateTime OccurredOn { get; }
}
