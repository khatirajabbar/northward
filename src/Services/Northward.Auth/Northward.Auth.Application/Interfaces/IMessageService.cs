using Northward.Auth.Application.DTOs;

namespace Northward.Auth.Application.Interfaces;

public interface IMessageService
{
    Task SendAsync(Guid userId, string text, bool mayShow);
    Task<List<MessageDto>> GetAllAsync();
    Task<List<ShownMessageDto>> GetShownAsync();
    // false if there's no such message; throws if the writer didn't agree
    Task<bool> SetShownAsync(Guid id, bool shown);
    Task<bool> DeleteAsync(Guid id);
}
