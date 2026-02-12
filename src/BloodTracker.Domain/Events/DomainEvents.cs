namespace BloodTracker.Domain.Events;

/// <summary>
/// Domain event raised when a new blood analysis is created.
/// </summary>
public sealed record AnalysisCreated(Guid AnalysisId, DateTime AnalysisDate) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

/// <summary>
/// Domain event raised when a supplement/drug course is started.
/// </summary>
public sealed record CourseStarted(Guid CourseId, Guid DrugId, DateTime StartDate) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

/// <summary>
/// Domain event raised when a supplement/drug course is ended.
/// </summary>
public sealed record CourseEnded(Guid CourseId, Guid DrugId, DateTime EndDate) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

/// <summary>
/// Domain event raised when a new drug is added to the system.
/// </summary>
public sealed record DrugAdded(Guid DrugId, string Name) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

/// <summary>
/// Domain event raised when a drug is deleted from the system.
/// </summary>
public sealed record DrugDeleted(Guid DrugId, string Name) : IDomainEvent
{
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}
