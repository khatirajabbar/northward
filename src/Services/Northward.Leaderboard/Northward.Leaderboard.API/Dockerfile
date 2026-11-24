# Northward.Leaderboard.API — multi-stage .NET 10 build.
# Build context is the repo root ('.'), so every COPY path is repo-root-relative.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the .csproj files first so `dotnet restore` is cached until a
# project file actually changes. This is the full transitive project closure
# of Northward.Leaderboard.API (API -> Infrastructure -> Application -> Domain).
COPY ["src/Services/Northward.Leaderboard/Northward.Leaderboard.API/Northward.Leaderboard.API.csproj", "src/Services/Northward.Leaderboard/Northward.Leaderboard.API/"]
COPY ["src/Services/Northward.Leaderboard/Northward.Leaderboard.Infrastructure/Northward.Leaderboard.Infrastructure.csproj", "src/Services/Northward.Leaderboard/Northward.Leaderboard.Infrastructure/"]
COPY ["src/Services/Northward.Leaderboard/Northward.Leaderboard.Application/Northward.Leaderboard.Application.csproj", "src/Services/Northward.Leaderboard/Northward.Leaderboard.Application/"]
COPY ["src/Services/Northward.Leaderboard/Northward.Leaderboard.Domain/Northward.Leaderboard.Domain.csproj", "src/Services/Northward.Leaderboard/Northward.Leaderboard.Domain/"]
RUN dotnet restore "src/Services/Northward.Leaderboard/Northward.Leaderboard.API/Northward.Leaderboard.API.csproj"

# Copy the remaining sources and publish.
COPY . .
RUN dotnet publish "src/Services/Northward.Leaderboard/Northward.Leaderboard.API/Northward.Leaderboard.API.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Northward.Leaderboard.API.dll"]
