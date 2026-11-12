# northward — the website

The site people land on: what the game is, how to play, the leaderboard, signing in, and the play page that holds the game itself. Built with Next.js.

## Run it on your machine

1. Start the game's services (from the repo root): `docker compose up -d`
2. Start the game (in `game-client`): `npm run dev`
3. Start this site (in `web`): `npm run dev`, then open http://localhost:3000

The first time, copy `.env.example` to `.env.local`. It says where the services and the game are.

## Where things are

- `src/app/(site)/` — the pages: home, how to play, leaderboard, log in, register, account, credits
- `src/app/play/` — the play page: the game, full window
- `src/app/globals.css` — the whole look: black and white, thin type, the glitch on words
- `src/components/` — the pieces the pages are made of
- `src/lib/` — talking to the sign-in and leaderboard services
