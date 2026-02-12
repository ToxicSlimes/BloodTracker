using BloodTracker.Domain.Models;
using FluentAssertions;
using Xunit;

namespace BloodTracker.Tests.Domain;

public class DrugTests
{
    [Fact]
    public void Drug_Should_SetRequiredProperties()
    {
        // Arrange & Act
        var drug = new Drug
        {
            Name = "Testosterone Enanthate",
            Type = DrugType.Injectable
        };

        // Assert
        drug.Name.Should().Be("Testosterone Enanthate");
        drug.Type.Should().Be(DrugType.Injectable);
    }

    [Theory]
    [InlineData(DrugType.Oral)]
    [InlineData(DrugType.Injectable)]
    [InlineData(DrugType.Subcutaneous)]
    [InlineData(DrugType.Transdermal)]
    [InlineData(DrugType.Nasal)]
    public void Drug_Should_SupportAllDrugTypes(DrugType type)
    {
        // Arrange & Act
        var drug = new Drug
        {
            Name = "Test Drug",
            Type = type
        };

        // Assert
        drug.Type.Should().Be(type);
    }

    [Fact]
    public void Drug_Should_SetOptionalProperties()
    {
        // Arrange
        var courseId = Guid.NewGuid();

        // Act
        var drug = new Drug
        {
            Name = "Test Drug",
            Type = DrugType.Oral,
            Dosage = "250mg",
            Amount = "100 tablets",
            Schedule = "2x per day",
            Notes = "Take with food",
            CourseId = courseId,
            CatalogItemId = "catalog-123",
            ManufacturerId = "mfr-456"
        };

        // Assert
        drug.Dosage.Should().Be("250mg");
        drug.Amount.Should().Be("100 tablets");
        drug.Schedule.Should().Be("2x per day");
        drug.Notes.Should().Be("Take with food");
        drug.CourseId.Should().Be(courseId);
        drug.CatalogItemId.Should().Be("catalog-123");
        drug.ManufacturerId.Should().Be("mfr-456");
    }

    [Fact]
    public void Drug_Should_AllowNullOptionalProperties()
    {
        // Arrange & Act
        var drug = new Drug
        {
            Name = "Test Drug",
            Type = DrugType.Injectable
        };

        // Assert
        drug.Dosage.Should().BeNull();
        drug.Amount.Should().BeNull();
        drug.Schedule.Should().BeNull();
        drug.Notes.Should().BeNull();
        drug.CourseId.Should().BeNull();
        drug.CatalogItemId.Should().BeNull();
        drug.ManufacturerId.Should().BeNull();
    }

    [Fact]
    public void Drug_Should_InheritFromEntity()
    {
        // Arrange & Act
        var drug = new Drug
        {
            Name = "Test Drug",
            Type = DrugType.Oral
        };

        // Assert
        drug.Id.Should().NotBeEmpty();
        drug.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void DrugType_Enum_Should_HaveExpectedValues()
    {
        // Assert
        Enum.IsDefined(typeof(DrugType), DrugType.Oral).Should().BeTrue();
        Enum.IsDefined(typeof(DrugType), DrugType.Injectable).Should().BeTrue();
        Enum.IsDefined(typeof(DrugType), DrugType.Subcutaneous).Should().BeTrue();
        Enum.IsDefined(typeof(DrugType), DrugType.Transdermal).Should().BeTrue();
        Enum.IsDefined(typeof(DrugType), DrugType.Nasal).Should().BeTrue();
    }
}
