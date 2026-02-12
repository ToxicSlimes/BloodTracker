using BloodTracker.Domain.Models;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class AnalysisTests
{
    [Fact]
    public void Analysis_Should_SetRequiredProperties()
    {
        // Arrange
        var date = DateTime.UtcNow;
        var label = "Blood Test March";
        var values = new Dictionary<string, double>
        {
            ["testosterone"] = 25.5,
            ["cholesterol"] = 5.2
        };

        // Act
        var analysis = new Analysis
        {
            Date = date,
            Label = label,
            Values = values
        };

        // Assert
        analysis.Date.Should().Be(date);
        analysis.Label.Should().Be(label);
        analysis.Values.Should().BeEquivalentTo(values);
        analysis.Laboratory.Should().BeNull();
        analysis.Notes.Should().BeNull();
    }

    [Fact]
    public void Analysis_Should_SetOptionalProperties()
    {
        // Arrange & Act
        var analysis = new Analysis
        {
            Date = DateTime.UtcNow,
            Label = "Test",
            Laboratory = "Invitro",
            Notes = "Fasting test"
        };

        // Assert
        analysis.Laboratory.Should().Be("Invitro");
        analysis.Notes.Should().Be("Fasting test");
    }

    [Fact]
    public void Analysis_Should_InitializeEmptyValuesDictionary()
    {
        // Arrange & Act
        var analysis = new Analysis
        {
            Date = DateTime.UtcNow,
            Label = "Test"
        };

        // Assert
        analysis.Values.Should().NotBeNull();
        analysis.Values.Should().BeEmpty();
    }

    [Fact]
    public void Analysis_Should_AllowUpdatingValues()
    {
        // Arrange
        var analysis = new Analysis
        {
            Date = DateTime.UtcNow,
            Label = "Test"
        };

        // Act
        analysis.Values["glucose"] = 5.5;
        analysis.Values["hemoglobin"] = 150;

        // Assert
        analysis.Values.Should().ContainKey("glucose");
        analysis.Values["glucose"].Should().Be(5.5);
        analysis.Values["hemoglobin"].Should().Be(150);
    }

    [Fact]
    public void Analysis_Should_InheritFromEntity()
    {
        // Arrange & Act
        var analysis = new Analysis
        {
            Date = DateTime.UtcNow,
            Label = "Test"
        };

        // Assert
        analysis.Id.Should().NotBeEmpty();
        analysis.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }
}
