using BloodTracker.Application.Workouts.Commands;
using FluentValidation;

namespace BloodTracker.Application.Workouts.Validators;

public sealed class CreateWorkoutProgramValidator : AbstractValidator<CreateWorkoutProgramCommand>
{
    public CreateWorkoutProgramValidator()
    {
        RuleFor(x => x.Data.Title)
            .NotEmpty()
            .WithMessage("Name is required");
    }
}
