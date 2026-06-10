# Northward

A story-driven 2D side-scrolling adventure game set in a Swedish forest, built as a graduation project for Code Academy Azerbaijan.

## Overview

Players choose a character, give it a custom name, pick a season (Summer or Winter), and explore a forest where kindness to animals is rewarded.

## Architecture

Microservices backend with an ASP.NET Core API Gateway, a Phaser.js game client, and an MVC web platform.

| Service | Responsibility |
|---|---|
| Northward.Auth | Registration, login, JWT authentication |
| Northward.Game | Save/load game state, player progress |
| Northward.Leaderboard | Scores, rankings, completion times |
| Northward.Gateway | API Gateway routing all traffic |
| Northward.WebApp | Public-facing MVC site (About, How to Play, Download) |

Each microservice follows **Onion Architecture**: Domain → Application → Infrastructure → API.

## Tech Stack

- **Game:** Phaser.js
- **Backend:** ASP.NET Core (.NET 10)
- **Messaging:** RabbitMQ
- **Database:** PostgreSQL (per service)
- **Infra:** Docker Compose
- **Docs:** Swagger / Scalar

## Getting Started

### Prerequisites
- Docker Desktop
- .NET 10 SDK

### Run

```bash
docker compose up --build
```

### Services (local)

| Service | URL |
|---|---|
| API Gateway | http://localhost:5000 |
| Auth API | http://localhost:5001 |
| Game API | http://localhost:5002 |
| Leaderboard API | http://localhost:5003 |
| Web App | http://localhost:5004 |
| RabbitMQ Dashboard | http://localhost:15672 |

## Project Structure

```
northward/
├── src/
│   ├── Services/
│   │   ├── Northward.Auth/
│   │   ├── Northward.Game/
│   │   └── Northward.Leaderboard/
│   ├── Gateway/
│   ├── BuildingBlocks/
│   └── WebApp/
├── game-client/
├── docker-compose.yml
└── README.md
```

## Author

Khatira Jabbarli — Code Academy Azerbaijan, 2026
