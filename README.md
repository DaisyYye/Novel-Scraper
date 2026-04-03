# Novel Scraper + Reader Backend

This project follows the below pipeline:

`scraper.py -> data/raw/*.json -> backend SQLite -> FastAPI -> frontend`

## Features

- Uses a JSON config file for site-specific selectors
- Scrapes chapter title and text
- Follows the next chapter link automatically
- Writes structured novel JSON for backend import
- Writes structured per-chapter JSON files
- Can still export TXT files as a secondary artifact
- Avoids duplicate lines and skips obvious navigation/promotional text
- Supports command-line overrides

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python scraper.py --config configs/sites.example.json
```

That defaults to JSON-first output in `data/raw/`.

## Optional overrides

```bash
python scraper.py \
  --config configs/sites.example.json \
  --max-chapters 20 \
  --delay 0.2 \
  --workers 3 \
  --export-format json+txt \
  --output-mode separate \
  --json-output-dir data/raw \
  --text-output-dir data/exports \
  --json-output-name sample_novel.json
```

## Structured JSON output

The scraper writes:

- `data/raw/<name>.json`: full novel document for backend import
- `data/raw/<name>/chapters/*.json`: per-chapter structured exports
- optional TXT exports in `data/exports/` if `--export-format` includes `txt`

Example novel document:

```json
{
  "id": "example-novel-123456789abc",
  "title": "Example Novel",
  "author": "Example Author",
  "source_url": "https://example.com/novel/1",
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

## Import into the backend

1. Start the API:

```bash
uvicorn backend.main:app --reload
```

2. Import the scraper JSON into SQLite:

```bash
python -m backend.scripts.import_novel_file data/raw/sample_novel.json
```

3. Or import through the API with a file path:

```bash
curl -X POST http://127.0.0.1:8000/novels/import ^
  -H "Content-Type: application/json" ^
  -d "{\"file_path\":\"data/raw/sample_novel.json\"}"
```

## Config fields

- `start_url`: first chapter URL
- `chapter_list_url`: optional table-of-contents URL used to collect chapter links
- `chapter_link_selector`: CSS selector for chapter links on the table-of-contents page
- `chapter_link_order`: `asc` or `desc` order for collected chapter links
- `title_selector`: CSS selector for chapter title
- `content_selectors`: ordered list of CSS selectors for chapter content
- `next_selector`: CSS selector for next chapter link
- `next_link_texts`: fallback link texts used to find next chapter
- `bad_phrases`: lines to ignore
- `min_line_length`: minimum length for kept lines
- `min_chapter_length`: minimum total chapter text length
- `max_chapters`: default scrape count
- `delay_seconds`: delay between requests
- `workers`: number of chapters to fetch in parallel
- `export_format`: `json`, `json+txt`, or `txt`
- `output_mode`: TXT layout, `single` or `separate`
- `output_dir`: legacy shared output folder for both JSON and TXT
- `json_output_dir`: structured JSON output folder
- `text_output_dir`: TXT export folder
- `output_name`: TXT filename for single-file mode
- `json_output_name`: filename for the structured novel JSON
- `novel_title`, `author`, `description`, `status`, `tags`: optional metadata overrides for the JSON export

## Notes

Use this only for content you are allowed to access and copy. Do not use it to bypass paywalls, logins, DRM, or site protections.

For faster runs, try `--delay 0.2` and a small worker count such as `--workers 3` to `--workers 5`.
