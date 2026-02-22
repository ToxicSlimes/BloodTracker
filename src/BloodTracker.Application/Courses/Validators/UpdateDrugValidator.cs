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

        RuleFor(x => x.Data.StandardDoseValue)
            .GreaterThan(0).When(x => x.Data.StandardDoseValue.HasValue);
        RuleFor(x => x.Data.ConcentrationMgPerMl)
            .GreaterThan(0).When(x => x.Data.ConcentrationMgPerMl.HasValue);
        RuleFor(x => x.Data.PackageSize)
            .GreaterThan(0).When(x => x.Data.PackageSize.HasValue);
    }
}
