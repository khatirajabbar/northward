using Northward.Auth.Application.DTOs;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;
using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Application.Services;

public class MessageService : IMessageService
{
    // enough for anyone with something to say, too few to fill the inbox with
    private const int MessagesPerDay = 5;
    // how many the website shows at most
    private const int MostShown = 12;

    private readonly IMessageRepository _messageRepository;

    public MessageService(IMessageRepository messageRepository)
    {
        _messageRepository = messageRepository;
    }

    public async Task SendAsync(Guid userId, string text, bool mayShow)
    {
        var today = await _messageRepository.CountByUserSinceAsync(userId, DateTime.UtcNow.AddDays(-1));
        if (today >= MessagesPerDay)
            throw new DomainException("That's a few messages already today. Write again tomorrow.");

        var message = Message.Create(userId, text, mayShow);
        await _messageRepository.AddAsync(message);
        await _messageRepository.SaveChangesAsync();
    }

    public Task<List<MessageDto>> GetAllAsync() => _messageRepository.GetAllWithWritersAsync();

    public Task<List<ShownMessageDto>> GetShownAsync() => _messageRepository.GetShownAsync(MostShown);

    public async Task<bool> SetShownAsync(Guid id, bool shown)
    {
        var message = await _messageRepository.GetByIdAsync(id);
        if (message is null) return false;

        message.SetShown(shown);
        await _messageRepository.SaveChangesAsync();
        return true;
    }

    public Task<bool> DeleteAsync(Guid id) => _messageRepository.DeleteAsync(id);
}
