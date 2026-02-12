using BloodTracker.Application.Courses.Commands;
using FluentValidation;

namespace BloodTracker.Application.Courses.Validators;

public sealed class UpdateDrugValidator : AbstractValidator<UpdateDrugCommand>
{
    public UpdateDrugValidator()
    {
        RuleFor(x => x.Data.Name)
            .NotEmpty()
            .WithMessage("Name is required");

        RuleFor(x => x.Data.Type)
            .IsInEnum()
            .WithMessage("Invalid drug type");
    }
}
