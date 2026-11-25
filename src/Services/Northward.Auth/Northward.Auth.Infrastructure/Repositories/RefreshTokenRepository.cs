using Microsoft.EntityFrameworkCore;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;
using Northward.Auth.Infrastructure.Persistence;

namespace Northward.Auth.Infrastructure.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AuthDbContext _context;

    public RefreshTokenRepository(AuthDbContext context)
    {
        _context = context;
    }

    // looked up by its fingerprint: the code itself isn't kept
    public async Task<RefreshToken?> GetByTokenAsync(string token)
    {
        var fingerprint = RefreshToken.FingerprintOf(token);
        return await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == fingerprint);
    }

    public async Task AddAsync(RefreshToken refreshToken) =>
        await _context.RefreshTokens.AddAsync(refreshToken);

    public void Update(RefreshToken refreshToken) =>
        _context.RefreshTokens.Update(refreshToken);

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}