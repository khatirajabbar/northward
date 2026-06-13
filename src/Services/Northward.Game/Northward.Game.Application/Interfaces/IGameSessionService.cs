using Northward.Game.Application.DTOs;

namespace Northward.Game.Application.Interfaces;

public interface IGameSessionService
{
    Task<GameSessionDto> StartAsync(Guid userId, CreateGameSessionDto dto);
    Task<List<GameSessionDto>> GetByUserIdAsync(Guid userId);
    Task<GameSessionDto> AddScoreAsync(Guid userId, Guid sessionId, int points);
    Task<GameSessionDto> CompleteAsync(Guid userId, Guid sessionId);
}