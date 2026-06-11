using Northward.Auth.Domain.Entities;

namespace Northward.Auth.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(Guid id);
    Task<bool> ExistsAsync(string email);
    Task AddAsync(User user);
    void Update(User user);
    Task SaveChangesAsync();
}