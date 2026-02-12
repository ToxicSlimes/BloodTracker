using BloodTracker.Application.Courses.Commands;
using FluentValidation;

namespace BloodTracker.Application.Courses.Validators;

public sealed class CreateCourseValidator : AbstractValidator<CreateCourseCommand>
{
    public CreateCourseValidator()
    {
        RuleFor(x => x.Data.Title)
            .NotEmpty()
            .WithMessage("Title is required");

        RuleFor(x => x.Data)
            .Must(x => !x.EndDate.HasValue || !x.StartDate.HasValue || x.EndDate.Value > x.StartDate.Value)
            .WithMessage("End date must be after start date");
    }
}
