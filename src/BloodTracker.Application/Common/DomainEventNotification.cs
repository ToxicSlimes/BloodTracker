using BloodTracker.Domain.Events;
using MediatR;

namespace BloodTracker.Application.Common;

/// <summary>
/// MediatR notification wrapper for domain events.
/// Allows handlers to subscribe to specific event types without domain depending on MediatR.
/// </summary>
public sealed record DomainEventNotification<TEvent>(TEvent DomainEvent) : INotification
    where TEvent : IDomainEvent;
