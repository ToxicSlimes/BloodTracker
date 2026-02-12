using BloodTracker.Domain.Models;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class EntityTests
{
    private class TestEntity : Entity { }

    [Fact]
    public void Entity_Should_GenerateUniqueId_OnCreation()
    {
        // Arrange & Act
        var entity1 = new TestEntity();
        var entity2 = new TestEntity();

        // Assert
        entity1.Id.Should().NotBeEmpty();
        entity2.Id.Should().NotBeEmpty();
        entity1.Id.Should().NotBe(entity2.Id);
    }

    [Fact]
    public void Entity_Should_SetCreatedAt_OnCreation()
    {
        // Arrange
        var before = DateTime.UtcNow;

        // Act
        var entity = new TestEntity();

        // Assert
        var after = DateTime.UtcNow;
        entity.CreatedAt.Should().BeOnOrAfter(before);
        entity.CreatedAt.Should().BeOnOrBefore(after);
    }

    [Fact]
    public void Entity_UpdatedAt_Should_BeNull_Initially()
    {
        // Arrange & Act
        var entity = new TestEntity();

        // Assert
        entity.UpdatedAt.Should().BeNull();
    }

    [Fact]
    public void Entity_Should_SupportSettingUpdatedAt()
    {
        // Arrange
        var entity = new TestEntity();
        var updateTime = DateTime.UtcNow.AddMinutes(5);

        // Act
        entity.UpdatedAt = updateTime;

        // Assert
        entity.UpdatedAt.Should().Be(updateTime);
    }

    [Fact]
    public void Entity_DomainEvents_Should_BeEmpty_Initially()
    {
        // Arrange & Act
        var entity = new TestEntity();

        // Assert
        entity.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void Entity_Should_SupportClearingDomainEvents()
    {
        // Arrange
        var entity = new TestEntity();

        // Act
        entity.ClearDomainEvents();

        // Assert
        entity.DomainEvents.Should().BeEmpty();
    }
}
