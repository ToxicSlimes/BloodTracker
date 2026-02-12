using BloodTracker.Application.Courses.Commands;
using FluentValidation;

namespace BloodTracker.Application.Courses.Validators;

public sealed class UpdatePurchaseValidator : AbstractValidator<UpdatePurchaseCommand>
{
    public UpdatePurchaseValidator()
    {
        RuleFor(x => x.Data.DrugId)
            .NotEmpty()
            .WithMessage("Drug ID is required");

        RuleFor(x => x.Data.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity must be greater than zero");

        RuleFor(x => x.Data.Price)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Price cannot be negative");
    }
}
