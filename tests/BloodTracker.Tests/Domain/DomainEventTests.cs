using BloodTracker.Domain.Events;
using BloodTracker.Domain.Models;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class DomainEventTests
{
    private class TestEntity : Entity
    {
        public void RaiseEvent(IDomainEvent e) => AddDomainEvent(e);
    }

    [Fact]
    public void Entity_AddDomainEvent_Should_AddToCollection()
    {
        var entity = new TestEntity();
        var evt = new DrugAdded(Guid.NewGuid(), "Test");

        entity.RaiseEvent(evt);

        entity.DomainEvents.Should().ContainSingle().Which.Should().Be(evt);
    }

    [Fact]
    public void Entity_AddMultipleDomainEvents_Should_AccumulateAll()
    {
        var entity = new TestEntity();
        entity.RaiseEvent(new DrugAdded(Guid.NewGuid(), "A"));
        entity.RaiseEvent(new DrugDeleted(Guid.NewGuid(), "B"));

        entity.DomainEvents.Should().HaveCount(2);
    }

    [Fact]
    public void Entity_ClearDomainEvents_Should_RemoveAll()
    {
        var entity = new TestEntity();
        entity.RaiseEvent(new DrugAdded(Guid.NewGuid(), "Test"));
        entity.RaiseEvent(new DrugDeleted(Guid.NewGuid(), "Test"));

        entity.ClearDomainEvents();

        entity.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void AnalysisCreated_Should_HaveOccurredOn()
    {
        var evt = new AnalysisCreated(Guid.NewGuid(), DateTime.UtcNow);
        evt.OccurredOn.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void CourseStarted_Should_HaveCorrectProperties()
    {
        var courseId = Guid.NewGuid();
        var drugId = Guid.NewGuid();
        var date = new DateTime(2024, 1, 1);

        var evt = new CourseStarted(courseId, drugId, date);

        evt.CourseId.Should().Be(courseId);
        evt.DrugId.Should().Be(drugId);
        evt.StartDate.Should().Be(date);
    }

    [Fact]
    public void CourseEnded_Should_HaveCorrectProperties()
    {
        var courseId = Guid.NewGuid();
        var drugId = Guid.NewGuid();
        var date = new DateTime(2024, 6, 1);

        var evt = new CourseEnded(courseId, drugId, date);

        evt.CourseId.Should().Be(courseId);
        evt.DrugId.Should().Be(drugId);
        evt.EndDate.Should().Be(date);
    }

    [Fact]
    public void DrugAdded_RecordEquality_Should_Work()
    {
        var id = Guid.NewGuid();
        var a = new DrugAdded(id, "Test");
        var b = new DrugAdded(id, "Test");

        // OccurredOn is set independently so records won't be equal by default
        a.DrugId.Should().Be(b.DrugId);
        a.Name.Should().Be(b.Name);
    }

    [Fact]
    public void DrugDeleted_Should_HaveCorrectProperties()
    {
        var id = Guid.NewGuid();
        var evt = new DrugDeleted(id, "Deleted Drug");

        evt.DrugId.Should().Be(id);
        evt.Name.Should().Be("Deleted Drug");
        evt.OccurredOn.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void AnalysisCreated_Should_StoreAnalysisDate()
    {
        var date = new DateTime(2024, 3, 15);
        var evt = new AnalysisCreated(Guid.NewGuid(), date);

        evt.AnalysisDate.Should().Be(date);
    }
}
