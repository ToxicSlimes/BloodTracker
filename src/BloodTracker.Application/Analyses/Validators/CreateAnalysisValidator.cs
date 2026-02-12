using BloodTracker.Application.Analyses.Commands;
using FluentValidation;

namespace BloodTracker.Application.Analyses.Validators;

public sealed class CreateAnalysisValidator : AbstractValidator<CreateAnalysisCommand>
{
    public CreateAnalysisValidator()
    {
        RuleFor(x => x.Data.Date)
            .NotEmpty()
            .WithMessage("Date is required");

        RuleFor(x => x.Data.Label)
            .NotEmpty()
            .WithMessage("Label is required");
    }
}
