namespace BloodTracker.Domain.Events;

/// <summary>
/// Marker interface for domain events.
/// Dispatched as MediatR notifications via DomainEventDispatcher.
/// </summary>
public interface IDomainEvent
{
    DateTime OccurredOn { get; }
}
