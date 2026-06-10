using Northward.Auth.Application.DTOs;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;
using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;

    public AuthService(IUserRepository userRepository, IJwtService jwtService)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _userRepository.ExistsAsync(request.Email))
            throw new DomainException("A user with this email already exists.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = User.Create(request.Username, request.Email, passwordHash);

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);
        return new AuthResponse(token, user.Username, user.Id);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email)
            ?? throw new DomainException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new DomainException("Invalid email or password.");

        var token = _jwtService.GenerateToken(user);
        return new AuthResponse(token, user.Username, user.Id);
    }
}
