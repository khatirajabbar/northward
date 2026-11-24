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
        ValidateName(customName);

        return new PlayerCharacter
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CharacterType = characterType,
            CustomName = customName.Trim(),
            IsUnlocked = characterType != CharacterTypes.Knight,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Unlock()
    {
        if (IsUnlocked)
            throw new InvalidOperationException("character is already unlocked");

        IsUnlocked = true;
    }

    public void Rename(string newName)
    {
        ValidateName(newName);
        CustomName = newName.Trim();
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("name cannot be empty", nameof(name));

        var trimmed = name.Trim();

        if (trimmed.Length < 2)
            throw new ArgumentException("name must be at least 2 characters", nameof(name));

        if (trimmed.Length > 20)
            throw new ArgumentException("name must be at most 20 characters", nameof(name));
    }
}
