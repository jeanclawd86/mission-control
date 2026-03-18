# Mission Control — Postgres Migration Task

## Overview
Migrate Mission Control from a local JSON file (`tasks.json`) to Vercel Postgres. Add bearer token auth on all API routes. The app is a Next.js 14 task management dashboard (Kanban board).

## Current Architecture
- Data lives in `tasks.json` — read/written via `fs` in API routes and `getData()` in `src/lib/data.ts`
- API routes in `src/app/api/tasks/route.ts` handle GET/POST/PATCH with `fs.readFileSync`/`fs.writeFileSync`
- Frontend polls `GET /api/tasks` every 5 seconds
- No authentication

## Target Architecture

### Database: Vercel Postgres (@vercel/postgres)
Install `@vercel/postgres` package.

Schema:
```sql
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  telegram_url TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS project_topics (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, topic_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'not-started',
  priority TEXT DEFAULT 'p2',
  project_id TEXT DEFAULT '',
  topic_id INTEGER REFERENCES topics(id),
  action_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_topic ON tasks(topic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
```

### Database Layer: `src/lib/db.ts`
Create a clean database module:
- Use `@vercel/postgres` `sql` template literal for queries
- Functions: `getAllData()`, `getTasks(filters?)`, `createTask(data)`, `updateTask(id, patch)`, `getTopics()`, `getProjects()`, `createTopic(data)`, `createProject(data)`, etc.
- Map snake_case DB columns to camelCase TypeScript types (the existing types in `src/lib/types.ts` use camelCase)

### API Setup Route: `src/app/api/setup/route.ts`
- POST endpoint that runs the CREATE TABLE statements above
- Protected by the same auth
- Idempotent (IF NOT EXISTS)
- Also has a POST body option to seed data from a JSON payload (for initial migration from tasks.json)

### Auth: Bearer Token
- Environment variable: `MC_API_KEY`
- Every API route checks `Authorization: Bearer <token>` header
- If missing or wrong, return 401
- Create a shared auth helper: `src/lib/auth.ts` with a function like `validateAuth(request: NextRequest): boolean`
- The frontend needs to send this token too. Use `NEXT_PUBLIC_MC_API_KEY` env var so it's available client-side. The Dashboard component should include it in all fetch calls.

### API Routes to Update

**`GET /api/tasks`** — Return full data (topics, projects, tasks) from Postgres
- Query all three tables
- Join project_topics to build the `topics: number[]` array on each project
- Return same shape as current: `{ topics: [...], projects: [...], tasks: [...] }`

**`POST /api/tasks`** — Create a task
- Insert into tasks table
- Return the created task

**`PATCH /api/tasks`** — Update a task
- Accept `id` + any combination of: `status`, `archivedAt`, `priority`, `title`, `description`, `actionInstructions`
- Update only provided fields
- Set `updated_at = now()`

**`POST /api/topics`** — New route to create a topic
**`POST /api/projects`** — New route to create a project

### Update `src/lib/data.ts`
- Replace `fs.readFileSync` with a call to the database
- This is used by the server component in `page.tsx`

### Update Frontend (`src/components/Dashboard.tsx`)
- All `fetch('/api/...')` calls need to include `Authorization: Bearer ${process.env.NEXT_PUBLIC_MC_API_KEY}` header
- No other frontend changes needed — the data shape stays the same

### Seed Script: `scripts/seed.ts`
- Reads `tasks.json` and POSTs all data to `/api/setup` with seed payload
- Or directly uses `@vercel/postgres` to insert
- This is for one-time migration

### Delete `tasks.json`
- Remove it from the project after migration is complete
- Remove the `public/snapshot.json` file and `scripts/snapshot.mjs` if they exist (those were for the old local architecture)

## Environment Variables Needed
```
POSTGRES_URL=...          # Vercel Postgres connection string (auto-set by Vercel when you link a DB)
MC_API_KEY=...            # Shared secret for API auth
NEXT_PUBLIC_MC_API_KEY=...  # Same value, exposed to frontend
```

## Important Notes
- Keep the same TypeScript types in `src/lib/types.ts` — frontend expects camelCase
- The `project` field on tasks maps to `project_id` in DB
- The `topic` field on tasks maps to `topic_id` in DB
- Keep `export const dynamic = 'force-dynamic'` on API routes
- Don't change any UI components except adding auth headers to fetch calls
- Don't change the visual design at all
- Test that the build works: `npm run build` should succeed (it won't connect to a real DB, but it should compile)
