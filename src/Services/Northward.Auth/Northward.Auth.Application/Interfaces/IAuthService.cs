using Northward.Auth.Application.DTOs;

namespace Northward.Auth.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
    Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request);
    Task<UserProfileResponseDto> GetCurrentUserAsync(Guid userId);
}
