using Northward.Auth.Domain.Entities;

namespace Northward.Auth.Application.Interfaces;

public interface IJwtService
{
    (string Token, DateTime ExpiresAt) GenerateAccessToken(User user);
    (string Token, DateTime ExpiresAt) GenerateRefreshToken();
}
