# Northward.WebApp — multi-stage .NET 10 build (MVC app; wwwroot ships via publish).
# Build context is the repo root ('.'), so every COPY path is repo-root-relative.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# The webapp has no ProjectReferences — it's a single self-contained project.
COPY ["src/WebApp/Northward.WebApp/Northward.WebApp.csproj", "src/WebApp/Northward.WebApp/"]
RUN dotnet restore "src/WebApp/Northward.WebApp/Northward.WebApp.csproj"

# Copy the remaining sources (including wwwroot) and publish.
COPY . .
RUN dotnet publish "src/WebApp/Northward.WebApp/Northward.WebApp.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Northward.WebApp.dll"]
