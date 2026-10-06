# Northward.Game.API — multi-stage .NET 10 build.
# Build context is the repo root ('.'), so every COPY path is repo-root-relative.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the .csproj files first so `dotnet restore` is cached until a
# project file actually changes. This is the full transitive project closure
# of Northward.Game.API (API -> Infrastructure -> Application -> Domain).
COPY ["src/Services/Northward.Game/Northward.Game.API/Northward.Game.API.csproj", "src/Services/Northward.Game/Northward.Game.API/"]
COPY ["src/Services/Northward.Game/Northward.Game.Infrastructure/Northward.Game.Infrastructure.csproj", "src/Services/Northward.Game/Northward.Game.Infrastructure/"]
COPY ["src/Services/Northward.Game/Northward.Game.Application/Northward.Game.Application.csproj", "src/Services/Northward.Game/Northward.Game.Application/"]
COPY ["src/Services/Northward.Game/Northward.Game.Domain/Northward.Game.Domain.csproj", "src/Services/Northward.Game/Northward.Game.Domain/"]
RUN dotnet restore "src/Services/Northward.Game/Northward.Game.API/Northward.Game.API.csproj"

# Copy the remaining sources and publish.
COPY . .
RUN dotnet publish "src/Services/Northward.Game/Northward.Game.API/Northward.Game.API.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Northward.Game.API.dll"]
