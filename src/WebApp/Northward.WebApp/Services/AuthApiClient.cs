using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace Northward.WebApp.Services;

public class AuthApiClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthApiClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AuthResult?> RegisterAsync(string username, string email, string password)
    {
        var client = _httpClientFactory.CreateClient("AuthApi");
        var response = await client.PostAsJsonAsync("api/auth/register", new
        {
            Username = username,
            Email = email,
            Password = password
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await ReadErrorAsync(response);
            return new AuthResult(false, null, error);
        }

        var data = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return new AuthResult(true, data, null);
    }

    public async Task<AuthResult?> LoginAsync(string email, string password)
    {
        var client = _httpClientFactory.CreateClient("AuthApi");
        var response = await client.PostAsJsonAsync("api/auth/login", new
        {
            Email = email,
            Password = password
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await ReadErrorAsync(response);
            return new AuthResult(false, null, error);
        }

        var data = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return new AuthResult(true, data, null);
    }

    public async Task<UserProfile?> GetCurrentUserAsync(string accessToken)
    {
        var client = _httpClientFactory.CreateClient("AuthApi");
        var request = new HttpRequestMessage(HttpMethod.Get, "api/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return null;

        return await response.Content.ReadFromJsonAsync<UserProfile>();
    }

    private static async Task<string> ReadErrorAsync(HttpResponseMessage response)
    {
        try
        {
            var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
            return body?["error"] ?? "something went wrong";
        }
        catch
        {
            return "something went wrong";
        }
    }
}

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string TokenType,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt,
    Guid UserId,
    string Username);

public record UserProfile(
    Guid UserId,
    string Username,
    string Email,
    DateTime CreatedAt,
    DateTime? LastLoginAt);

public record AuthResult(bool Success, AuthResponse? Data, string? Error);
