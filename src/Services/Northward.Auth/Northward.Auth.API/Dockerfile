# Northward.Auth.API — multi-stage .NET 10 build.
# Build context is the repo root ('.'), so every COPY path is repo-root-relative.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the .csproj files first so `dotnet restore` is cached until a
# project file actually changes. This is the full transitive project closure
# of Northward.Auth.API (API -> Infrastructure -> Application -> Domain).
COPY ["src/Services/Northward.Auth/Northward.Auth.API/Northward.Auth.API.csproj", "src/Services/Northward.Auth/Northward.Auth.API/"]
COPY ["src/Services/Northward.Auth/Northward.Auth.Infrastructure/Northward.Auth.Infrastructure.csproj", "src/Services/Northward.Auth/Northward.Auth.Infrastructure/"]
COPY ["src/Services/Northward.Auth/Northward.Auth.Application/Northward.Auth.Application.csproj", "src/Services/Northward.Auth/Northward.Auth.Application/"]
COPY ["src/Services/Northward.Auth/Northward.Auth.Domain/Northward.Auth.Domain.csproj", "src/Services/Northward.Auth/Northward.Auth.Domain/"]
RUN dotnet restore "src/Services/Northward.Auth/Northward.Auth.API/Northward.Auth.API.csproj"

# Copy the remaining sources and publish.
COPY . .
RUN dotnet publish "src/Services/Northward.Auth/Northward.Auth.API/Northward.Auth.API.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Northward.Auth.API.dll"]
