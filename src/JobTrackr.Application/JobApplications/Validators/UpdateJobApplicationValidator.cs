using FluentValidation;
using JobTrackr.Application.JobApplications.Dtos;

namespace JobTrackr.Application.JobApplications.Validators;

public class UpdateJobApplicationValidator : AbstractValidator<UpdateJobApplicationRequest>
{
    public UpdateJobApplicationValidator()
    {
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Position).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Location).MaximumLength(200);
        RuleFor(x => x.JobUrl).MaximumLength(2000);
        RuleFor(x => x.Notes).MaximumLength(4000);
        RuleFor(x => x.SalaryMin).GreaterThanOrEqualTo(0).When(x => x.SalaryMin.HasValue);
        RuleFor(x => x.SalaryMax).GreaterThanOrEqualTo(0).When(x => x.SalaryMax.HasValue);
        RuleFor(x => x).Must(x => !x.SalaryMin.HasValue || !x.SalaryMax.HasValue || x.SalaryMax >= x.SalaryMin)
            .WithMessage("SalaryMax must be greater than or equal to SalaryMin.");
    }
}
