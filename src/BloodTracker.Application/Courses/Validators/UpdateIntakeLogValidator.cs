using BloodTracker.Application.Courses.Commands;
using FluentValidation;

namespace BloodTracker.Application.Courses.Validators;

public sealed class UpdateIntakeLogValidator : AbstractValidator<UpdateIntakeLogCommand>
{
    public UpdateIntakeLogValidator()
    {
        RuleFor(x => x.Data.DrugId)
            .NotEmpty()
            .WithMessage("Drug ID is required");

        RuleFor(x => x.Data.Date)
            .NotEqual(default(DateTime))
            .WithMessage("Date is required");
    }
}
