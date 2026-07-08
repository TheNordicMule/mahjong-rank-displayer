# Mahjong Rank Displayer

A riichi mahjong rank and score tracker. Record games, view a live leaderboard, and dig into per-player stats, placement distributions, and points/rank trends over time.

## Features

- **Dashboard** — leaderboard with rank, average placement, and key stats.
- **Record** — log new games (and edit existing ones via `/record/:id`).
- **History** — browse past games.
- **Range** — filter stats across a custom date range.
- **Player detail** — per-player breakdown with placement pie/bars, points trend, and rank trend charts.

## Tech Stack

- **Frontend:** React 18, React Router 6, Vite 5
- **Backend:** Cloudflare Pages Functions (`/functions/api`)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Deploy:** Cloudflare Pages

## Getting Started

```bash
npm install
npm run dev          # Vite dev server (frontend only)
npm run build        # production build to dist/
npm run preview      # preview the production build
```

For full local development (frontend + Pages Functions API + D1):

```bash
npm run dev:all
```

## Backend / D1 Setup

This project uses Cloudflare D1 as its database, served via Cloudflare Pages Functions.

### Prerequisites

- Node.js 18+
- A Cloudflare account with D1 enabled
- Wrangler CLI (included as a dev dependency)

### Setup Steps

1. **Create the D1 database**:
   ```bash
   npm run db:create
   ```
   Copy the printed `database_id` (a UUID) and paste it into `wrangler.toml` replacing the existing `database_id`.

2. **Run database migrations**:
   ```bash
   npm run db:migrate:local   # apply migrations to local dev D1
   npm run db:migrate         # apply migrations to remote D1
   ```

3. **Start local development (API + Vite)**:
   ```bash
   npm run dev:all
   ```
   This runs both Pages Functions and the Vite dev server together.

4. **Deploy to Cloudflare Pages**:
   ```bash
   npm run deploy
   ```
   Ensure the D1 binding in your Cloudflare Pages project dashboard matches the `database_name` and `database_id` in `wrangler.toml`.

## Project Structure

```
src/
  components/   # Layout, Leaderboard, charts (PlacementPie, PointsTrend, RankTrend, ...)
  pages/        # Dashboard, Record, History, Range, PlayerDetail
  hooks/        # useGames
  utils/        # format, scoring, stats, storage
functions/
  api/          # Cloudflare Pages Functions (players, games)
migrations/     # D1 SQL migrations
public/         # static assets + _redirects
```

## License

[MIT](./LICENSE) © TheNordicMule