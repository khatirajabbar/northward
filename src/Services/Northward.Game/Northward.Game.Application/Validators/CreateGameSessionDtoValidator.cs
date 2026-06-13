using FluentValidation;
using Northward.Game.Application.DTOs;
using Northward.Game.Domain.Entities;

namespace Northward.Game.Application.Validators;

public class CreateGameSessionDtoValidator : AbstractValidator<CreateGameSessionDto>
{
    private static readonly string[] AllowedSeasons = 
        { Seasons.Summer, Seasons.Winter };

    public CreateGameSessionDtoValidator()
    {
        RuleFor(x => x.PlayerCharacterId)
            .NotEmpty().WithMessage("player character id is required");

        RuleFor(x => x.Season)
            .NotEmpty().WithMessage("season is required")
            .Must(season => AllowedSeasons.Contains(season))
            .WithMessage("season must be 'summer' or 'winter'");
    }
}