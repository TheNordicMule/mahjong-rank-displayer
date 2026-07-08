# Mahjong Rank Displayer

Riichi mahjong rank/score tracker.

```bash
npm install
npm run dev
npm run build
```

## Backend / D1 Setup

This project uses Cloudflare D1 as its database, served via Cloudflare Pages Functions.

### Prerequisites

- Node.js 18+
- A Cloudflare account with D1 enabled
- Wrangler CLI (included as dev dependency)

### Setup Steps

1. **Create the D1 database**:
   ```bash
   npm run db:create
   ```
   Copy the printed `database_id` (a UUID) and paste it into `wrangler.toml` replacing `<REPLACE_WITH_D1_DATABASE_ID>`.

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
