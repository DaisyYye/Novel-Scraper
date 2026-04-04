# Backend

FastAPI + SQLite + SQLAlchemy + Pydantic backend for the novel reading app.

## Install

```bash
pip install -r requirements.txt
```

## Initialize the database

```bash
python -m backend.scripts.init_database
```

## Seed sample data

```bash
python -m backend.scripts.seed_sample_data
```

## Run the API

```bash
uvicorn backend.main:app --reload
```

## Authentication

The backend expects Clerk session tokens on authenticated requests and keeps its own `users` table
for roles and ownership.

Required environment variables:

```bash
DATABASE_URL=
ALLOW_SQLITE_FALLBACK=false
ADMIN_EMAIL=owner@example.com
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_AUDIENCE=
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Deploy on Railway

Use the repo root as the Railway service root. Do not set the Railway Root Directory to `/backend`,
because this backend imports modules as `backend.*` and installs dependencies from the repo-level
`requirements.txt`.

Recommended Railway settings:

- Root Directory: leave empty
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Recommended variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
ALLOW_SQLITE_FALLBACK=false
ADMIN_EMAIL=owner@example.com
ALLOWED_ORIGINS=https://your-frontend-domain
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_AUDIENCE=
```

Notes:

- `DATABASE_URL` is optional for local development. If omitted, the app falls back to
  `backend/data/novel_reader.db`.
- On Railway, `DATABASE_URL` is required by default so deploys fail fast instead of silently
  writing imported novels into ephemeral SQLite storage.
- If you stay on SQLite in production, the filesystem is not durable across redeploys unless you add
  a persistent volume.
- `ALLOW_SQLITE_FALLBACK=true` is an escape hatch if you intentionally want ephemeral SQLite on
  Railway for a temporary environment.

Behavior:

- every `/novels`, `/reader-settings`, and `/progress/*` endpoint now requires a valid Clerk token
- `POST /novels/import`, `PUT/DELETE /novels/{id}`, and chapter write routes require `admin`
- a local `users` row is created or refreshed on first login
- `ADMIN_EMAIL` is the bootstrap path for the admin role

## Run frontend + backend together

From the repo root:

```bash
npm run dev
```

That starts:

- FastAPI at `http://127.0.0.1:8000`
- Vite at `http://127.0.0.1:5173`

The frontend uses the Vite dev proxy by default, so you do not need to hardcode the backend URL for local development.

The SQLite database now lives at `backend/data/novel_reader.db`.

## Import structured scraper output

```bash
python -m backend.scripts.import_novel_file path/to/novel.json
```

`POST /novels/import` accepts either:

- a direct structured JSON payload
- a JSON body with `{"file_path":"data/raw/novel.json"}`

The direct structured JSON can be the scraper's nested format:

```json
{
  "id": "example-novel-123456789abc",
  "title": "Example Novel",
  "author": "Example Author",
  "description": "Optional description",
  "source_site": "example",
  "source_url": "https://example.com/novel/1",
  "status": "ongoing",
  "cover_url": null,
  "tags": ["tag-one", "tag-two"],
  "chapters": [
    {
      "id": "example-novel-123456789abc-ch-0001",
      "chapter_number": 1,
      "title": "Chapter 1",
      "content": "Chapter text",
      "word_count": 1200,
      "source_url": "https://example.com/novel/1/chapter-1"
    }
  ]
}
```

The older wrapped payload is also still accepted:

```json
{
  "novel": {
    "title": "Example Novel"
  },
  "chapters": []
}
```
