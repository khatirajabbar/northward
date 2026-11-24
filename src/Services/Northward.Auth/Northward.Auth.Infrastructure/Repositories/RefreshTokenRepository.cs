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

    public async Task<RefreshToken?> GetByTokenAsync(string token) =>
        await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == token);

    public async Task AddAsync(RefreshToken refreshToken) =>
        await _context.RefreshTokens.AddAsync(refreshToken);

    public void Update(RefreshToken refreshToken) =>
        _context.RefreshTokens.Update(refreshToken);

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}