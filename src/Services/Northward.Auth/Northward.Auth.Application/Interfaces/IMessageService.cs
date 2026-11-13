using Northward.Auth.Application.DTOs;

namespace Northward.Auth.Application.Interfaces;

public interface IMessageService
{
    Task SendAsync(Guid userId, string text);
    Task<List<MessageDto>> GetAllAsync();
    Task<bool> DeleteAsync(Guid id);
}
