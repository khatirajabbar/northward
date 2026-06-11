using Northward.Auth.Application.DTOs;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;
using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Application.Services;

public class AuthService : IAuthService
{
    private const string TokenType = "Bearer";

    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IJwtService _jwtService;

    public AuthService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IJwtService jwtService)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _jwtService = jwtService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        if (await _userRepository.ExistsAsync(request.Email))
            throw new DomainException("A user with this email already exists.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = User.Create(request.Username, request.Email, passwordHash);

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return await BuildAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email)
            ?? throw new DomainException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new DomainException("Invalid email or password.");

        user.RecordLogin();
        await _userRepository.SaveChangesAsync();

        return await BuildAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request)
    {
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(request.RefreshToken)
            ?? throw new DomainException("Invalid refresh token.");

        if (!storedToken.IsActive)
            throw new DomainException("Refresh token is no longer valid.");

        var user = await _userRepository.GetByIdAsync(storedToken.UserId)
            ?? throw new DomainException("User no longer exists.");

        var newAccessToken = _jwtService.GenerateAccessToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken();
        var newRefreshTokenEntity = RefreshToken.Create(user.Id, newRefreshToken.Token, newRefreshToken.ExpiresAt);

        storedToken.Revoke(newRefreshToken.Token);
        _refreshTokenRepository.Update(storedToken);
        await _refreshTokenRepository.AddAsync(newRefreshTokenEntity);
        await _refreshTokenRepository.SaveChangesAsync();

        return new AuthResponseDto(
            AccessToken: newAccessToken.Token,
            RefreshToken: newRefreshToken.Token,
            TokenType: TokenType,
            AccessTokenExpiresAt: newAccessToken.ExpiresAt,
            RefreshTokenExpiresAt: newRefreshToken.ExpiresAt,
            UserId: user.Id,
            Username: user.Username
        );
    }

    public async Task<UserProfileResponseDto> GetCurrentUserAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new DomainException("User not found.");

        return new UserProfileResponseDto(
            UserId: user.Id,
            Username: user.Username,
            Email: user.Email,
            CreatedAt: user.CreatedAt,
            LastLoginAt: user.LastLoginAt
        );
    }

    private async Task<AuthResponseDto> BuildAuthResponseAsync(User user)
    {
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = RefreshToken.Create(user.Id, refreshToken.Token, refreshToken.ExpiresAt);
        await _refreshTokenRepository.AddAsync(refreshTokenEntity);
        await _refreshTokenRepository.SaveChangesAsync();

        return new AuthResponseDto(
            AccessToken: accessToken.Token,
            RefreshToken: refreshToken.Token,
            TokenType: TokenType,
            AccessTokenExpiresAt: accessToken.ExpiresAt,
            RefreshTokenExpiresAt: refreshToken.ExpiresAt,
            UserId: user.Id,
            Username: user.Username
        );
    }
}
