using BloodTracker.Application.Workouts.Commands;
using BloodTracker.Application.Workouts.Dto;
using BloodTracker.Application.Workouts.Validators;
using BloodTracker.Application.Courses.Commands;
using BloodTracker.Application.Courses.Dto;
using BloodTracker.Application.Courses.Validators;
using BloodTracker.Domain.Models;
using FluentValidation.TestHelper;
using Xunit;

namespace BloodTracker.Tests.Application;

public class WorkoutValidationTests
{
    #region CreateWorkoutProgramValidator

    [Fact]
    public void CreateWorkoutProgramValidator_ShouldRejectEmptyTitle()
    {
        // Arrange
        var validator = new CreateWorkoutProgramValidator();
        var dto = new CreateWorkoutProgramDto { Title = "" };
        var command = new CreateWorkoutProgramCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Title);
    }

    [Fact]
    public void CreateWorkoutProgramValidator_ShouldAcceptValidCommand()
    {
        // Arrange
        var validator = new CreateWorkoutProgramValidator();
        var dto = new CreateWorkoutProgramDto 
        { 
            Title = "My Workout Program",
            Notes = "Optional notes"
        };
        var command = new CreateWorkoutProgramCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    #endregion

    #region CreateWorkoutDayValidator

    [Fact]
    public void CreateWorkoutDayValidator_ShouldRejectEmptyProgramId()
    {
        // Arrange
        var validator = new CreateWorkoutDayValidator();
        var dto = new CreateWorkoutDayDto 
        { 
            ProgramId = Guid.Empty,
            DayOfWeek = DayOfWeek.Monday,
            Title = "Chest Day"
        };
        var command = new CreateWorkoutDayCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.ProgramId);
    }

    [Fact]
    public void CreateWorkoutDayValidator_ShouldRejectEmptyTitle()
    {
        // Arrange
        var validator = new CreateWorkoutDayValidator();
        var dto = new CreateWorkoutDayDto 
        { 
            ProgramId = Guid.NewGuid(),
            DayOfWeek = DayOfWeek.Monday,
            Title = ""
        };
        var command = new CreateWorkoutDayCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Title);
    }

    [Fact]
    public void CreateWorkoutDayValidator_ShouldAcceptValidCommand()
    {
        // Arrange
        var validator = new CreateWorkoutDayValidator();
        var dto = new CreateWorkoutDayDto 
        { 
            ProgramId = Guid.NewGuid(),
            DayOfWeek = DayOfWeek.Monday,
            Title = "Chest Day",
            Notes = "Focus on compound movements"
        };
        var command = new CreateWorkoutDayCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    #endregion

    #region CreateWorkoutExerciseValidator

    [Fact]
    public void CreateWorkoutExerciseValidator_ShouldRejectEmptyDayId()
    {
        // Arrange
        var validator = new CreateWorkoutExerciseValidator();
        var dto = new CreateWorkoutExerciseDto 
        { 
            ProgramId = Guid.NewGuid(),
            DayId = Guid.Empty,
            Name = "Bench Press",
            MuscleGroup = MuscleGroup.Chest
        };
        var command = new CreateWorkoutExerciseCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.DayId);
    }

    [Fact]
    public void CreateWorkoutExerciseValidator_ShouldRejectEmptyName()
    {
        // Arrange
        var validator = new CreateWorkoutExerciseValidator();
        var dto = new CreateWorkoutExerciseDto 
        { 
            ProgramId = Guid.NewGuid(),
            DayId = Guid.NewGuid(),
            Name = "",
            MuscleGroup = MuscleGroup.Chest
        };
        var command = new CreateWorkoutExerciseCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Name);
    }

    [Fact]
    public void CreateWorkoutExerciseValidator_ShouldAcceptValidCommand()
    {
        // Arrange
        var validator = new CreateWorkoutExerciseValidator();
        var dto = new CreateWorkoutExerciseDto 
        { 
            ProgramId = Guid.NewGuid(),
            DayId = Guid.NewGuid(),
            Name = "Bench Press",
            MuscleGroup = MuscleGroup.Chest,
            Notes = "3 sets of 8-12 reps"
        };
        var command = new CreateWorkoutExerciseCommand(dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    #endregion

    #region UpdateIntakeLogValidator

    [Fact]
    public void UpdateIntakeLogValidator_ShouldRejectEmptyDrugId()
    {
        // Arrange
        var validator = new UpdateIntakeLogValidator();
        var dto = new UpdateIntakeLogDto 
        { 
            DrugId = Guid.Empty,
            Date = DateTime.UtcNow,
            Dose = "10mg"
        };
        var command = new UpdateIntakeLogCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.DrugId);
    }

    [Fact]
    public void UpdateIntakeLogValidator_ShouldRejectDefaultDate()
    {
        // Arrange
        var validator = new UpdateIntakeLogValidator();
        var dto = new UpdateIntakeLogDto 
        { 
            DrugId = Guid.NewGuid(),
            Date = default,
            Dose = "10mg"
        };
        var command = new UpdateIntakeLogCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Date);
    }

    [Fact]
    public void UpdateIntakeLogValidator_ShouldAcceptValidCommand()
    {
        // Arrange
        var validator = new UpdateIntakeLogValidator();
        var dto = new UpdateIntakeLogDto 
        { 
            DrugId = Guid.NewGuid(),
            Date = DateTime.UtcNow,
            Dose = "10mg",
            Note = "Taken with food"
        };
        var command = new UpdateIntakeLogCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    #endregion

    #region UpdatePurchaseValidator

    [Fact]
    public void UpdatePurchaseValidator_ShouldRejectEmptyDrugId()
    {
        // Arrange
        var validator = new UpdatePurchaseValidator();
        var dto = new UpdatePurchaseDto 
        { 
            DrugId = Guid.Empty,
            Quantity = 100,
            Price = 50.0m,
            PurchaseDate = DateTime.UtcNow
        };
        var command = new UpdatePurchaseCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.DrugId);
    }

    [Fact]
    public void UpdatePurchaseValidator_ShouldRejectZeroQuantity()
    {
        // Arrange
        var validator = new UpdatePurchaseValidator();
        var dto = new UpdatePurchaseDto 
        { 
            DrugId = Guid.NewGuid(),
            Quantity = 0,
            Price = 50.0m,
            PurchaseDate = DateTime.UtcNow
        };
        var command = new UpdatePurchaseCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Quantity);
    }

    [Fact]
    public void UpdatePurchaseValidator_ShouldRejectNegativePrice()
    {
        // Arrange
        var validator = new UpdatePurchaseValidator();
        var dto = new UpdatePurchaseDto 
        { 
            DrugId = Guid.NewGuid(),
            Quantity = 100,
            Price = -10.0m,
            PurchaseDate = DateTime.UtcNow
        };
        var command = new UpdatePurchaseCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Data.Price);
    }

    [Fact]
    public void UpdatePurchaseValidator_ShouldAcceptValidCommand()
    {
        // Arrange
        var validator = new UpdatePurchaseValidator();
        var dto = new UpdatePurchaseDto 
        { 
            DrugId = Guid.NewGuid(),
            Quantity = 100,
            Price = 50.0m,
            PurchaseDate = DateTime.UtcNow,
            Notes = "Purchased from pharmacy"
        };
        var command = new UpdatePurchaseCommand(Guid.NewGuid(), dto);

        // Act
        var result = validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    #endregion
}
