using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Northward.Leaderboard.Application.Interfaces;
using Northward.Leaderboard.Application.Services;
using Northward.Leaderboard.Application.Validators;
using Northward.Leaderboard.Domain.Repositories;
using Northward.Leaderboard.Infrastructure.Persistence;
using Northward.Leaderboard.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<LeaderboardDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Application services
builder.Services.AddScoped<ILeaderboardRepository, LeaderboardRepository>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();

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
builder.Services.AddValidatorsFromAssemblyContaining<SubmitEntryRequestDtoValidator>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Northward Leaderboard API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = System.IO.Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (System.IO.File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
});

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
    var db = scope.ServiceProvider.GetRequiredService<LeaderboardDbContext>();
    db.Database.Migrate();
}

app.UseMiddleware<Northward.Leaderboard.API.Middleware.ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("GameClient");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
