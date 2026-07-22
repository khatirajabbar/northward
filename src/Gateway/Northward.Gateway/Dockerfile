# Northward.Gateway — multi-stage .NET 10 build.
# Build context is the repo root ('.'), so every COPY path is repo-root-relative.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# The gateway has no ProjectReferences — it's a single self-contained project.
COPY ["src/Gateway/Northward.Gateway/Northward.Gateway.csproj", "src/Gateway/Northward.Gateway/"]
RUN dotnet restore "src/Gateway/Northward.Gateway/Northward.Gateway.csproj"

# Copy the remaining sources and publish.
COPY . .
RUN dotnet publish "src/Gateway/Northward.Gateway/Northward.Gateway.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Northward.Gateway.dll"]
