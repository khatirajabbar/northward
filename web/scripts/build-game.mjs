// Builds the game (../game-client) into this site, at /game — so the site and
// the game are one address: one sign-in for both, and no other server to run.
// Runs by itself before `next build` (the "prebuild" script).
//
// The game reaches its services through this site (/svc/a, /svc/g, /svc/l in
// next.config.ts): see game-client/.env.production.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const game = path.resolve(web, "../game-client");
const out = path.join(web, "public/game");
const run = (command) => execSync(command, { cwd: game, stdio: "inherit" });

if (!fs.existsSync(path.join(game, "node_modules"))) run("npm ci");
run(`npx vite build --base /game/ --outDir "${out}" --emptyOutDir`);
console.log("the game is built into public/game");
