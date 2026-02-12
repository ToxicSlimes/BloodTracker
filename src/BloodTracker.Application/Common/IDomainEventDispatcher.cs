using BloodTracker.Domain.Events;

namespace BloodTracker.Application.Common;

/// <summary>
/// Dispatches domain events collected from entities as MediatR notifications.
/// </summary>
public interface IDomainEventDispatcher
{
    Task DispatchEventsAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default);
}
