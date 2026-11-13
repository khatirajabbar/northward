using Microsoft.EntityFrameworkCore;
using Northward.Auth.Application.DTOs;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;
using Northward.Auth.Infrastructure.Persistence;

namespace Northward.Auth.Infrastructure.Repositories;

public class MessageRepository : IMessageRepository
{
    private readonly AuthDbContext _context;

    public MessageRepository(AuthDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Message message) =>
        await _context.Messages.AddAsync(message);

    public async Task<int> CountByUserSinceAsync(Guid userId, DateTime since) =>
        await _context.Messages.CountAsync(m => m.UserId == userId && m.CreatedAt >= since);

    // newest first, each with its writer's name and email
    public async Task<List<MessageDto>> GetAllWithWritersAsync() =>
        await _context.Messages
            .OrderByDescending(m => m.CreatedAt)
            .Join(_context.Users, m => m.UserId, u => u.Id,
                (m, u) => new MessageDto(m.Id, u.Username, u.Email, m.Text, m.CreatedAt))
            .ToListAsync();

    public async Task<bool> DeleteAsync(Guid id) =>
        await _context.Messages.Where(m => m.Id == id).ExecuteDeleteAsync() > 0;

    public async Task SaveChangesAsync() =>
        await _context.SaveChangesAsync();
}
