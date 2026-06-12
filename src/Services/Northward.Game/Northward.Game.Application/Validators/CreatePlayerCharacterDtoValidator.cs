using FluentValidation;
using Northward.Game.Application.DTOs;
using Northward.Game.Domain.Entities;

namespace Northward.Game.Application.Validators;

public class CreatePlayerCharacterDtoValidator : AbstractValidator<CreatePlayerCharacterDto>
{
    private static readonly string[] AllowedTypes = 
        { CharacterTypes.Female, CharacterTypes.Male, CharacterTypes.Knight };

    public CreatePlayerCharacterDtoValidator()
    {
        RuleFor(x => x.CharacterType)
            .NotEmpty().WithMessage("character type is required")
            .Must(type => AllowedTypes.Contains(type))
            .WithMessage("character type must be 'female', 'male', or 'knight'");

        RuleFor(x => x.CustomName)
            .NotEmpty().WithMessage("custom name is required")
            .MinimumLength(2).WithMessage("custom name must be at least 2 characters")
            .MaximumLength(20).WithMessage("custom name must be at most 20 characters");
    }
}