using FluentValidation;
using Northward.Game.Application.DTOs;
using Northward.Game.Domain.Entities;

namespace Northward.Game.Application.Validators;

public class UpdateProgressDtoValidator : AbstractValidator<UpdateProgressDto>
{
    private static readonly string[] AllowedScenes =
        { Scenes.Morning, Scenes.Forest, Scenes.Ending };

    public UpdateProgressDtoValidator()
    {
        RuleFor(x => x.CurrentScene)
            .NotEmpty().WithMessage("current scene is required")
            .Must(scene => AllowedScenes.Contains(scene))
            .WithMessage("current scene must be 'MorningScene', 'ForestScene' or 'EndingScene'");

        RuleFor(x => x.Score)
            .GreaterThanOrEqualTo(0).WithMessage("score cannot be negative");

        RuleFor(x => x.Checkpoint)
            .MaximumLength(40).WithMessage("checkpoint cannot exceed 40 characters")
            .When(x => x.Checkpoint != null);
    }
}
