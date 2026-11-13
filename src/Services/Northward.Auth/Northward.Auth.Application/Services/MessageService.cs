using Northward.Auth.Application.DTOs;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Entities;
using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Application.Services;

public class MessageService : IMessageService
{
    // enough for anyone with something to say, too few to fill the inbox with
    private const int MessagesPerDay = 5;

    private readonly IMessageRepository _messageRepository;

    public MessageService(IMessageRepository messageRepository)
    {
        _messageRepository = messageRepository;
    }

    public async Task SendAsync(Guid userId, string text)
    {
        var today = await _messageRepository.CountByUserSinceAsync(userId, DateTime.UtcNow.AddDays(-1));
        if (today >= MessagesPerDay)
            throw new DomainException("That's a few messages already today. Write again tomorrow.");

        var message = Message.Create(userId, text);
        await _messageRepository.AddAsync(message);
        await _messageRepository.SaveChangesAsync();
    }

    public Task<List<MessageDto>> GetAllAsync() => _messageRepository.GetAllWithWritersAsync();

    public Task<bool> DeleteAsync(Guid id) => _messageRepository.DeleteAsync(id);
}
