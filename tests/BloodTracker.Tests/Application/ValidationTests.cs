using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Validators;
using BloodTracker.Domain.Models;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace BloodTracker.Tests.Application;

public class ValidationTests
{
    [Fact]
    public void CreateCourseValidator_Should_RejectEmptyTitle()
    {
        // Arrange
        var validator = new CreateCourseValidator();
        var command = new CreateCourseCommand(new CreateCourseDto
        {
            Title = ""
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Title)
            .WithErrorMessage("Title is required");
    }

    [Fact]
    public void CreateCourseValidator_Should_AcceptValidTitle()
    {
        // Arrange
        var validator = new CreateCourseValidator();
        var command = new CreateCourseCommand(new CreateCourseDto
        {
            Title = "Spring Cycle"
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Data.Title);
    }

    [Fact]
    public void CreateCourseValidator_Should_RejectEndDateBeforeStartDate()
    {
        // Arrange
        var validator = new CreateCourseValidator();
        var command = new CreateCourseCommand(new CreateCourseDto
        {
            Title = "Test Course",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(-10)
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data)
            .WithErrorMessage("End date must be after start date");
    }

    [Fact]
    public void CreateCourseValidator_Should_AcceptValidDateRange()
    {
        // Arrange
        var validator = new CreateCourseValidator();
        var command = new CreateCourseCommand(new CreateCourseDto
        {
            Title = "Test Course",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(3)
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Data);
    }

    [Fact]
    public void CreateDrugValidator_Should_RejectEmptyName()
    {
        // Arrange
        var validator = new CreateDrugValidator();
        var command = new CreateDrugCommand(new CreateDrugDto
        {
            Name = "",
            Type = DrugType.Oral
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Name)
            .WithErrorMessage("Name is required");
    }

    [Fact]
    public void CreateDrugValidator_Should_AcceptValidDrug()
    {
        // Arrange
        var validator = new CreateDrugValidator();
        var command = new CreateDrugCommand(new CreateDrugDto
        {
            Name = "Testosterone",
            Type = DrugType.Injectable
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void CreateDrugValidator_Should_RejectInvalidDrugType()
    {
        // Arrange
        var validator = new CreateDrugValidator();
        var command = new CreateDrugCommand(new CreateDrugDto
        {
            Name = "Test Drug",
            Type = (DrugType)999
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Type)
            .WithErrorMessage("Invalid drug type");
    }

    [Theory]
    [InlineData(DrugType.Oral)]
    [InlineData(DrugType.Injectable)]
    [InlineData(DrugType.Subcutaneous)]
    [InlineData(DrugType.Transdermal)]
    [InlineData(DrugType.Nasal)]
    public void CreateDrugValidator_Should_AcceptAllValidDrugTypes(DrugType type)
    {
        // Arrange
        var validator = new CreateDrugValidator();
        var command = new CreateDrugCommand(new CreateDrugDto
        {
            Name = "Test Drug",
            Type = type
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Data.Type);
    }

    [Fact]
    public void UpdateDrugValidator_Should_RejectEmptyName()
    {
        // Arrange
        var validator = new UpdateDrugValidator();
        var command = new UpdateDrugCommand(Guid.NewGuid(), new UpdateDrugDto
        {
            Name = "",
            Type = DrugType.Oral
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Name)
            .WithErrorMessage("Name is required");
    }

    [Fact]
    public void CreateIntakeLogValidator_Should_RejectEmptyDrugId()
    {
        // Arrange
        var validator = new CreateIntakeLogValidator();
        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            DrugId = Guid.Empty,
            Date = DateTime.UtcNow
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.DrugId);
    }

    [Fact]
    public void CreateIntakeLogValidator_Should_AcceptValidIntakeLog()
    {
        // Arrange
        var validator = new CreateIntakeLogValidator();
        var command = new CreateIntakeLogCommand(new CreateIntakeLogDto
        {
            DrugId = Guid.NewGuid(),
            Date = DateTime.UtcNow,
            Dose = "100mg"
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void CreatePurchaseValidator_Should_RejectNegativeQuantity()
    {
        // Arrange
        var validator = new CreatePurchaseValidator();
        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = Guid.NewGuid(),
            PurchaseDate = DateTime.UtcNow,
            Quantity = -10,
            Price = 100
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Quantity);
    }

    [Fact]
    public void CreatePurchaseValidator_Should_RejectNegativePrice()
    {
        // Arrange
        var validator = new CreatePurchaseValidator();
        var command = new CreatePurchaseCommand(new CreatePurchaseDto
        {
            DrugId = Guid.NewGuid(),
            PurchaseDate = DateTime.UtcNow,
            Quantity = 100,
            Price = -50
        });

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Price);
    }
}
