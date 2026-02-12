using BloodTracker.Application.Workouts.Commands;
using FluentValidation;

namespace BloodTracker.Application.Workouts.Validators;

public sealed class CreateWorkoutExerciseValidator : AbstractValidator<CreateWorkoutExerciseCommand>
{
    public CreateWorkoutExerciseValidator()
    {
        RuleFor(x => x.Data.DayId)
            .NotEmpty()
            .WithMessage("Day ID is required");

        RuleFor(x => x.Data.Name)
            .NotEmpty()
            .WithMessage("Name is required");
    }
}
