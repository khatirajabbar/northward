# Northward

A quiet, story-driven 2D side-scrolling adventure through a Swedish forest. Every morning a bird sings at your window and flies north; today you follow it. Started as a graduation project for Code Academy Azerbaijan.

## Overview

You choose one of two travelers and walk north through the forest. Along the road are small troubles you can stop for or walk past. Stopping is what's counted: the leaderboard ranks kindness, not speed. The game plays in the browser, with or without an account.

## Architecture

Three microservices, a Phaser game client, and a Next.js website.

| Part | Responsibility |
|---|---|
| Northward.Auth | Registration, login, JWT authentication, account deletion |
| Northward.Game | Travelers, saved journeys, progress |
| Northward.Leaderboard | Finished journeys: kindness and completion times |
| Northward.Gateway | API gateway (a placeholder, not wired up yet) |
| game-client | The game itself (Phaser 3, built with Vite) |
| web | The website: home, how to play, leaderboard, sign-in, account, and the play page |

Each microservice follows **Onion Architecture**: Domain → Application → Infrastructure → API.

## Tech Stack

- **Game:** Phaser 3, Vite
- **Website:** Next.js
- **Backend:** ASP.NET Core (.NET 10)
- **Database:** PostgreSQL (one per service)
- **Infra:** Docker Compose
- **API docs:** Swagger

## Getting Started

### Prerequisites
- Docker Desktop
- Node.js

### Run

The services and their databases (needs a `.env` file in this folder with the database and JWT settings):

```bash
docker compose up -d
```

The game:

```bash
cd game-client && npm install && npm run dev
```

The website (the first time, copy `web/.env.example` to `web/.env.local`):

```bash
cd web && npm install && npm run dev
```

### Local addresses

| What | URL |
|---|---|
| Website | http://localhost:3000 |
| Game | http://localhost:5173 |
| Auth API | http://localhost:5001 |
| Game API | http://localhost:5002 |
| Leaderboard API | http://localhost:5003 |
| API Gateway | http://localhost:5006 |

## Project Structure

```
northward/
├── src/
│   ├── Services/
│   │   ├── Northward.Auth/
│   │   ├── Northward.Game/
│   │   └── Northward.Leaderboard/
│   ├── Gateway/
│   └── BuildingBlocks/
├── game-client/
├── web/
├── docker-compose.yml
└── README.md
```

## Author

Khatira Jabbarli — Code Academy Azerbaijan, 2026
