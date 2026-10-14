using Northward.Game.Application.DTOs;
using Northward.Game.Application.Interfaces;
using Northward.Game.Domain.Entities;
using Northward.Game.Domain.Repositories;

namespace Northward.Game.Application.Services;

public class GameSessionService : IGameSessionService
{
    private readonly IGameSessionRepository _gameSessionRepository;

    public GameSessionService(IGameSessionRepository gameSessionRepository)
    {
        _gameSessionRepository = gameSessionRepository;
    }

    public async Task<GameSessionDto> StartAsync(Guid userId, CreateGameSessionDto dto)
    {
        // the save slots are full: the player has to let one journey go first
        var open = await _gameSessionRepository.GetByUserIdAsync(userId);
        if (open.Count(s => !s.IsCompleted) >= GameSession.MaxOpenPerUser)
            throw new InvalidOperationException($"you already have {GameSession.MaxOpenPerUser} journeys — let one go first");

        var gameSession = GameSession.Create(userId, dto.PlayerCharacterId, dto.Season);
        await _gameSessionRepository.AddAsync(gameSession);
        return MapToDto(gameSession);
    }

    public async Task<List<GameSessionDto>> GetByUserIdAsync(Guid userId)
    {
        var sessions = await _gameSessionRepository.GetByUserIdAsync(userId);
        return sessions
            .Where(s => !s.IsCompleted)
            .OrderByDescending(s => s.LastPlayedAt)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<GameSessionDto> AddScoreAsync(Guid userId, Guid sessionId, int points)
    {
        var session = await _gameSessionRepository.GetByIdAsync(sessionId);

        if (session == null || session.UserId != userId)
            throw new KeyNotFoundException("session not found");

        session.AddScore(points);
        await _gameSessionRepository.UpdateAsync(session);
        return MapToDto(session);
    }

    public async Task<GameSessionDto> UpdateProgressAsync(Guid userId, Guid sessionId, UpdateProgressDto dto)
    {
        var session = await _gameSessionRepository.GetByIdAsync(sessionId);

        if (session == null || session.UserId != userId)
            throw new KeyNotFoundException("session not found");

        session.UpdateProgress(dto.CurrentScene, dto.Score, dto.Checkpoint);
        await _gameSessionRepository.UpdateAsync(session);
        return MapToDto(session);
    }

    public async Task<GameSessionDto> CompleteAsync(Guid userId, Guid sessionId)
    {
        var session = await _gameSessionRepository.GetByIdAsync(sessionId);

        if (session == null || session.UserId != userId)
            throw new KeyNotFoundException("session not found");

        // finished: the kindness goes to the leaderboard (the game sends it), and
        // the journey itself isn't kept, so its save slot is free again
        session.Complete();
        await _gameSessionRepository.DeleteAsync(session);
        return MapToDto(session);
    }

    public async Task DeleteAsync(Guid userId, Guid sessionId)
    {
        var session = await _gameSessionRepository.GetByIdAsync(sessionId);

        if (session == null || session.UserId != userId)
            throw new KeyNotFoundException("session not found");

        await _gameSessionRepository.DeleteAsync(session);
    }

    private static GameSessionDto MapToDto(GameSession gameSession)
    {
        return new GameSessionDto(
            Id: gameSession.Id,
            PlayerCharacterId: gameSession.PlayerCharacterId,
            Season: gameSession.Season,
            CurrentScene: gameSession.CurrentScene,
            Checkpoint: gameSession.Checkpoint,
            Score: gameSession.Score,
            IsCompleted: gameSession.IsCompleted,
            StartedAt: gameSession.StartedAt,
            LastPlayedAt: gameSession.LastPlayedAt,
            CompletedAt: gameSession.CompletedAt
        );
    }
}
