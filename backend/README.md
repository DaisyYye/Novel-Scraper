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
