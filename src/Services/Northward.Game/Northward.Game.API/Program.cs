using Npgsql;
using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Northward.Game.Application.Interfaces;
using Northward.Game.Application.Services;
using Northward.Game.Application.Validators;
using Northward.Game.Domain.Repositories;
using Northward.Game.Infrastructure.Persistence;
using Northward.Game.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Database. Published (render.yaml), the database's address and password are
// set apart from the rest of the connection string: once for all three
// services, and the password never written into the repository
var database = new NpgsqlConnectionStringBuilder(builder.Configuration.GetConnectionString("DefaultConnection"));
if (builder.Configuration["Database:Host"] is { Length: > 0 } databaseHost) database.Host = databaseHost;
if (builder.Configuration["Database:Password"] is { Length: > 0 } databasePassword) database.Password = databasePassword;
builder.Services.AddDbContext<GameDbContext>(options =>
    options.UseNpgsql(database.ConnectionString));

// Application services
builder.Services.AddScoped<IPlayerCharacterRepository, PlayerCharacterRepository>();
builder.Services.AddScoped<IPlayerCharacterService, PlayerCharacterService>();
builder.Services.AddScoped<IGameSessionRepository, GameSessionRepository>();
builder.Services.AddScoped<IGameSessionService, GameSessionService>();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CreatePlayerCharacterDtoValidator>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("GameClient", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5222")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Auto-apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GameDbContext>();
    db.Database.Migrate();
}

app.UseMiddleware<Northward.Game.API.Middleware.ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("GameClient");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// "are you awake?" — asked by the host to see the service is up, and by the
// website as soon as someone opens it, so a service that fell asleep wakes in time
app.MapGet("/health", () => Results.Ok("ok"));

app.Run();
