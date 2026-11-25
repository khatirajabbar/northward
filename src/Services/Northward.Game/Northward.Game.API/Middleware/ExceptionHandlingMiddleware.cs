using System.Net;
using System.Text.Json;

namespace Northward.Game.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "an unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // Only a problem this service's own code describes ("session not found",
        // "that's a few journeys in one hour already") is passed on as it is.
        // Anything else — the database or a library failing — is answered with a
        // plain sentence: its own message can show how the service is built
        // inside, and that's for the log above, not for whoever asked.
        var ours = exception.TargetSite?.DeclaringType?.Namespace?.StartsWith("Northward") == true;

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = !ours ? (int)HttpStatusCode.InternalServerError : exception switch
        {
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            ArgumentException => (int)HttpStatusCode.BadRequest,
            InvalidOperationException => (int)HttpStatusCode.Conflict,
            _ => (int)HttpStatusCode.InternalServerError
        };

        var response = new
        {
            status = context.Response.StatusCode,
            message = context.Response.StatusCode == (int)HttpStatusCode.InternalServerError
                ? "something went wrong on our side. try again in a moment."
                : exception.Message
        };

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }
}
