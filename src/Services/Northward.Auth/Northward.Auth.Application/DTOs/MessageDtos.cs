using System.ComponentModel.DataAnnotations;

namespace Northward.Auth.Application.DTOs;

// what a player sends
public record SendMessageRequestDto(
    [Required(ErrorMessage = "The message is empty.")]
    [StringLength(2000, MinimumLength = 1, ErrorMessage = "The message can be 2000 characters at most.")]
    string Text,
    // "you can show this on the website": off unless the writer ticks it
    bool MayShow = false
);

// a message as the admin page shows it: who wrote it, and how to write back
public record MessageDto(
    Guid Id,
    string Username,
    string Email,
    string Text,
    DateTime CreatedAt,
    bool MayShow,
    bool Shown
);

// a message as the website shows it to everyone: never the email
public record ShownMessageDto(
    Guid Id,
    string Username,
    string Text,
    DateTime CreatedAt
);

// the admin putting a message on the website, or taking it off
public record SetShownRequestDto(
    bool Shown
);

// the admin page's own password, and the pass it's traded for
public record AdminEnterRequestDto(
    [Required(ErrorMessage = "Password is required.")]
    string Password
);

public record AdminPassDto(
    string Token,
    DateTime ExpiresAt
);
