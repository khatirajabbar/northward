using Northward.Auth.Domain.Entities;

namespace Northward.Auth.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
}
