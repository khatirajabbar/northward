# Publishing Northward

Everything runs on free plans:

| what | where | address |
| --- | --- | --- |
| the website, with the game built into it at `/game` | Vercel | `northward.vercel.app` (or close to it) |
| the three services: sign-in, journeys, leaderboard | Render (`render.yaml`) | `northward-auth.onrender.com`, … |
| their three databases | Neon | — |

The browser only ever talks to the website. The website passes service
requests on (`web/next.config.ts`), so the game and the site are one address,
and signing in on one signs you in on both.

On Render's free plan a service falls asleep after about 15 quiet minutes,
and takes 30–60 seconds to wake. The site and the game both ask the services
to wake as soon as they're opened. If sign-in is still slow, its button says
"waking the forest". Playing without an account never waits.

The site and the services rebuild by themselves whenever `main` changes on
GitHub.

## 1. Neon: the databases

1. Sign up at neon.tech with GitHub.
2. Make a project called `northward`, in the region **AWS Europe Central (Frankfurt)**.
3. Under **Databases**, add three: `auth`, `game`, `leaderboard`.
4. Open **Connect** and set it up like this:
   - choose a database;
   - turn **Connection pooling** off;
   - pick **.NET** from the list.
5. Copy its connection string. It looks like
   `Host=ep-….eu-central-1.aws.neon.tech;Database=auth;Username=…;Password=…;SSL Mode=Require`.
   Do this for all three databases, and keep the strings somewhere private
   (they hold the password).

## 2. Render: the services

1. Sign up at render.com with GitHub.
2. Go to **New → Blueprint**, pick the `northward` repository, and Render reads
   `render.yaml`.
3. It asks for:
   - **ConnectionStrings__DefaultConnection**, once for each service: the
     Neon string for *its own* database (auth → `auth`, game → `game`,
     leaderboard → `leaderboard`);
   - **Admin__Password**: a new password for the website's `/admin` page.
4. Click **Apply**. The first builds take several minutes.
5. When all three are "Live", open `https://<service>.onrender.com/health` for
   each one. Each should say `"ok"`. Note the three addresses.

## 3. Vercel: the website and the game

1. Sign up at vercel.com with GitHub.
2. Go to **Add New → Project** and import the `northward` repository.
3. **Root Directory**: `web`. Vercel sees it's Next.js by itself.
4. Under **Environment Variables**, add the three Render addresses, with no `/`
   at the end:
   - `AUTH_URL` = `https://northward-auth.onrender.com`
   - `GAME_URL` = `https://northward-game.onrender.com`
   - `LEADERBOARD_URL` = `https://northward-leaderboard.onrender.com`

   Don't set `NEXT_PUBLIC_GAME_URL`: published, the play page uses the game
   built into the site.
5. Click **Deploy**. The build makes the game first (`web/scripts/build-game.mjs`),
   then the site.
6. To change the address, go to the project's **Settings → Domains**. You can
   add your own domain there later.

## On your machine

Nothing changes. `docker compose up`, `npm run dev` in `game-client` and in
`web` work as before, with your `.env.local` files. `npm run build` in `web`
also builds the game into `web/public/game`. That folder isn't kept in git.
