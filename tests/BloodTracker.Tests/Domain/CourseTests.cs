using BloodTracker.Domain.Models;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class CourseTests
{
    [Fact]
    public void Course_Should_SetRequiredTitle()
    {
        // Arrange & Act
        var course = new Course
        {
            Title = "Spring 2026 Cycle"
        };

        // Assert
        course.Title.Should().Be("Spring 2026 Cycle");
    }

    [Fact]
    public void Course_Should_DefaultToActive()
    {
        // Arrange & Act
        var course = new Course
        {
            Title = "Test Course"
        };

        // Assert
        course.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Course_Should_AllowSettingInactive()
    {
        // Arrange & Act
        var course = new Course
        {
            Title = "Test Course",
            IsActive = false
        };

        // Assert
        course.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Course_Should_SetOptionalDates()
    {
        // Arrange
        var startDate = DateTime.UtcNow;
        var endDate = DateTime.UtcNow.AddMonths(3);

        // Act
        var course = new Course
        {
            Title = "Test Course",
            StartDate = startDate,
            EndDate = endDate
        };

        // Assert
        course.StartDate.Should().Be(startDate);
        course.EndDate.Should().Be(endDate);
    }

    [Fact]
    public void Course_Should_AllowNullDates()
    {
        // Arrange & Act
        var course = new Course
        {
            Title = "Test Course"
        };

        // Assert
        course.StartDate.Should().BeNull();
        course.EndDate.Should().BeNull();
    }

    [Fact]
    public void Course_Should_SetOptionalNotes()
    {
        // Arrange & Act
        var course = new Course
        {
            Title = "Test Course",
            Notes = "Doctor prescribed"
        };

        // Assert
        course.Notes.Should().Be("Doctor prescribed");
    }

    [Fact]
    public void Course_Should_InheritFromEntity()
    {
        // Arrange & Act
        var course = new Course
        {
            Title = "Test Course"
        };

        // Assert
        course.Id.Should().NotBeEmpty();
        course.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }
}
