# Novel TXT Scraper

A configurable Python scraper that extracts chapter text from a novel website and saves it into `.txt` files.

## Features

- Uses a JSON config file for site-specific selectors
- Scrapes chapter title and text
- Follows the next chapter link automatically
- Saves output as one file or separate chapter files
- Avoids duplicate lines and skips obvious navigation/promotional text
- Supports command-line overrides

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python scraper.py --config sites.example.json
```

## Optional overrides

```bash
python scraper.py \
  --config sites.example.json \
  --max-chapters 20 \
  --output-mode separate \
  --output-dir output
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
- `output_mode`: `single` or `separate`
- `output_dir`: output folder
- `output_name`: filename for single-file mode

## Notes

Use this only for content you are allowed to access and copy. Do not use it to bypass paywalls, logins, DRM, or site protections.

## Suggested GitHub steps

```bash
git init
git add .
git commit -m "Initial commit: configurable novel txt scraper"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Why this is better

- You do not need to edit Python code for each new site.
- Site-specific logic moves into JSON config.
- Command-line overrides make testing faster.
- Output mode is flexible.
- The scraper is now closer to a reusable tool than a one-off script.

## Good next upgrades

- Add retry logic with exponential backoff
- Add logging instead of print statements
- Export to EPUB
- Detect encodings more reliably
- Add a Playwright mode for JS-rendered sites
- Support multiple site configs in a `sites/` folder
