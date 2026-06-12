using Northward.Auth.Domain.Entities;

namespace Northward.Auth.Application.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token);
    Task AddAsync(RefreshToken refreshToken);
    void Update(RefreshToken refreshToken);
    Task SaveChangesAsync();
}