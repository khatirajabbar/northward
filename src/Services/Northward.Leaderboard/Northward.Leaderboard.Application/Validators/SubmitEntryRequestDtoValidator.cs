using FluentValidation;
using Northward.Leaderboard.Application.DTOs;

namespace Northward.Leaderboard.Application.Validators;

public class SubmitEntryRequestDtoValidator : AbstractValidator<SubmitEntryRequestDto>
{
    private static readonly string[] AllowedSeasons = { "summer", "winter" };
    private static readonly string[] AllowedCharacterTypes = { "female", "male", "knight" };

    // The most kindness one journey can hold: every kind thing the road offers,
    // once each (the fox cub, the horse and the three in the meadow, the
    // goodbye, the cat, the bird, the fawn, the stag, the squirrel, the
    // duckling, the bee, the turtle and the bridge). The game sends its own
    // count, so anything above this didn't come from playing.
    // Change it whenever a puzzle that gives kindness is added or taken out.
    public const int MaxKindness = 16;

    // Nobody walks from the cabin to the end of the road this fast.
    public static readonly TimeSpan FastestPossible = TimeSpan.FromMinutes(1);

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
            .GreaterThanOrEqualTo(0).WithMessage("score cannot be negative")
            .LessThanOrEqualTo(MaxKindness).WithMessage($"score cannot be more than {MaxKindness}");

        RuleFor(x => x.CompletionTime)
            .Must(t => t >= FastestPossible).WithMessage("completion time is too short")
            .Must(t => t < TimeSpan.FromDays(1)).WithMessage("completion time must be under a day");
    }
}
