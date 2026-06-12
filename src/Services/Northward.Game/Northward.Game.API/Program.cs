using Microsoft.EntityFrameworkCore;
using Northward.Game.Application.Services;
using Northward.Game.Domain.Repositories;
using Northward.Game.Infrastructure.Data;
using Northward.Game.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<GameDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("GameDb")));

builder.Services.AddScoped<IPlayerCharacterRepository, PlayerCharacterRepository>();
builder.Services.AddScoped<IPlayerCharacterService, PlayerCharacterService>();
builder.Services.AddScoped<IGameSessionRepository, GameSessionRepository>();
builder.Services.AddScoped<IGameSessionService, GameSessionService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();