using BloodTracker.Application.Workouts.Commands;
using FluentValidation;

namespace BloodTracker.Application.Workouts.Validators;

public sealed class CreateWorkoutDayValidator : AbstractValidator<CreateWorkoutDayCommand>
{
    public CreateWorkoutDayValidator()
    {
        RuleFor(x => x.Data.ProgramId)
            .NotEmpty()
            .WithMessage("Program ID is required");

        RuleFor(x => x.Data.Title)
            .NotEmpty()
            .WithMessage("Title is required");
    }
}
