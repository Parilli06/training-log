# Coach Claude — Personal Training App

A mobile-first PWA for tracking training, food, supplements, recovery, and alcohol — with an AI coach (Claude) that plans sessions and reviews your training based on your Garmin watch data.

## Stack

- **Frontend**: React + Vite + Tailwind CSS (PWA)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic API (Claude Sonnet for coaching, Haiku for food parsing)
- **Watch data**: Garmin connector (separate Vercel app, `garmin-mcp`)

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required for local dev:
- `VITE_SUPABASE_URL` — from Supabase Settings → API
- `VITE_SUPABASE_ANON_KEY` — from Supabase Settings → API
- `ANTHROPIC_API_KEY` — from console.anthropic.com

Optional (for Garmin data):
- `GARMIN_MCP_URL` — your deployed garmin-mcp URL
- `GARMIN_MCP_TOKEN` — shared auth token

For Vercel deployment, the API routes also need:
- `SUPABASE_SERVICE_ROLE_KEY` — for server-side DB writes in API routes

### 2. Database migrations

Run each file in `supabase/migrations/` in order in the Supabase SQL Editor:

```
0001_sessions.sql
0002_settings.sql
0003_alcohol.sql
0004_food.sql
0005_planned_sessions.sql
0006_supps.sql
0007_coach_notes.sql
0008_nutrition_targets.sql
0009_programme_context_and_reviews.sql
0010_weekly_schedule.sql
```

### 3. Install and run locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

1. Push to GitHub
2. Import in Vercel (auto-detects Vite)
3. Add environment variables in Vercel project settings
4. Deploy

### 5. Install on iPhone

Open the deployed URL in Safari → Share → Add to Home Screen.

## App tabs

| Tab | What it does |
|-----|------|
| Today | Garmin morning brief, yesterday's nutrition, AI session planner |
| Workout | Log sessions with day templates, sets/reps/weight/RPE, photo import, AI review |
| Food | Log meals by text or photo, macro tracking with daily targets |
| Supps | Supplement checklist, recovery logging (sauna, ice bath, etc.) |
| Alcohol | Drinks log with UK units, weekly cap tracker |
| Settings | Programme schedule, nutrition targets, key lifts, AI context |

## Customisation

Everything in Settings is yours to configure. The most important thing is the **AI Context** field — write your training history, goals, injuries, and current programme. The more detail you put in, the better the coaching.

## Costs

- GitHub, Vercel, Supabase: free tiers sufficient for personal use
- Anthropic API: ~£5–15/month depending on coaching usage
