using BloodTracker.Application.Common;
using BloodTracker.Domain.Events;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BloodTracker.Infrastructure.Services;

/// <summary>
/// Dispatches domain events as MediatR notifications.
/// Wraps each IDomainEvent in DomainEventNotification&lt;T&gt; and publishes.
/// </summary>
public sealed class DomainEventDispatcher(IMediator mediator, ILogger<DomainEventDispatcher> logger)
    : IDomainEventDispatcher
{
    public async Task DispatchEventsAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default)
    {
        foreach (var domainEvent in events)
        {
            var eventType = domainEvent.GetType();
            var notificationType = typeof(DomainEventNotification<>).MakeGenericType(eventType);
            var notification = Activator.CreateInstance(notificationType, domainEvent)!;

            logger.LogDebug("Dispatching domain event {EventType}", eventType.Name);

            await mediator.Publish(notification, ct);
        }
    }
}
