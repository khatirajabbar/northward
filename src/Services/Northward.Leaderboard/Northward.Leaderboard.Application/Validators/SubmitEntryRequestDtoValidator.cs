using FluentValidation;
using Northward.Leaderboard.Application.DTOs;

namespace Northward.Leaderboard.Application.Validators;

public class SubmitEntryRequestDtoValidator : AbstractValidator<SubmitEntryRequestDto>
{
    private static readonly string[] AllowedSeasons = { "summer", "winter" };
    private static readonly string[] AllowedCharacterTypes = { "female", "male", "knight" };

    public SubmitEntryRequestDtoValidator()
    {
        RuleFor(x => x.CharacterType)
            .NotEmpty().WithMessage("character type is required")
            .Must(t => AllowedCharacterTypes.Contains(t))
            .WithMessage("character type must be 'female', 'male', or 'knight'");

        RuleFor(x => x.Season)
            .NotEmpty().WithMessage("season is required")
            .Must(s => AllowedSeasons.Contains(s))
            .WithMessage("season must be 'summer' or 'winter'");

        RuleFor(x => x.Score)
            .GreaterThanOrEqualTo(0).WithMessage("score cannot be negative");

        RuleFor(x => x.CompletionTime)
            .Must(t => t > TimeSpan.Zero).WithMessage("completion time must be positive");
    }
}