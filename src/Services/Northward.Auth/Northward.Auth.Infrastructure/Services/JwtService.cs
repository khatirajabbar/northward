using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;

namespace Northward.Auth.Infrastructure.Services;

public class JwtService : IJwtService
{
    private const int AccessTokenLifetimeMinutes = 15;
    private const int RefreshTokenLifetimeDays = 7;
    private const int RefreshTokenByteSize = 64;

    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAt) GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]!));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email)
        };

        var expiresAt = DateTime.UtcNow.AddMinutes(AccessTokenLifetimeMinutes);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return (tokenString, expiresAt);
    }

    public (string Token, DateTime ExpiresAt) GenerateRefreshToken()
    {
        var randomBytes = RandomNumberGenerator.GetBytes(RefreshTokenByteSize);
        var token = Convert.ToBase64String(randomBytes);
        var expiresAt = DateTime.UtcNow.AddDays(RefreshTokenLifetimeDays);

        return (token, expiresAt);
    }
}