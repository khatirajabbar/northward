namespace Northward.Game.Domain.Entities;

public class PlayerCharacter
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string CharacterType { get; private set; } = string.Empty;
    public string CustomName { get; private set; } = string.Empty;
    public bool IsUnlocked { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private PlayerCharacter() { }

    public static PlayerCharacter Create(Guid userId, string characterType, string customName)
    {
        return new PlayerCharacter
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CharacterType = characterType,
            CustomName = customName,
            IsUnlocked = characterType != CharacterTypes.Knight,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Unlock()
    {
        IsUnlocked = true;
    }

    public void Rename(string newName)
    {
        CustomName = newName;
    }
}