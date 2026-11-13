using Northward.Auth.Application.DTOs;
using Northward.Auth.Domain.Entities;

namespace Northward.Auth.Application.Interfaces;

public interface IMessageRepository
{
    Task AddAsync(Message message);
    Task<int> CountByUserSinceAsync(Guid userId, DateTime since);
    Task<List<MessageDto>> GetAllWithWritersAsync();
    Task<bool> DeleteAsync(Guid id);
    Task SaveChangesAsync();
}
