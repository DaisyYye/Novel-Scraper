import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/146.0.0.0 Safari/537.36"
    )
}

DEFAULT_BAD_PHRASES = [
    "上一章",
    "下一章",
    "目录",
    "首页",
    "内容未完",
    "继续阅读",
    "下载",
    "APP测试上线",
    "设为标签",
    "方便下次阅读",
]


def load_config(config_path: str) -> dict:
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[\\/*?:"<>|]', "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name or "novel"


def fetch_soup(session: requests.Session, url: str) -> BeautifulSoup:
    response = session.get(url, timeout=20)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    return BeautifulSoup(response.text, "html.parser")


def extract_title(soup: BeautifulSoup, title_selector: str | None, fallback: str) -> str:
    if title_selector:
        node = soup.select_one(title_selector)
        if node:
            text = node.get_text(" ", strip=True)
            if text:
                return text

    h1 = soup.find("h1")
    if h1:
        text = h1.get_text(" ", strip=True)
        if text:
            return text

    return fallback


def extract_text(soup: BeautifulSoup, config: dict) -> str:
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    selectors = config.get("content_selectors", [])
    bad_phrases = config.get("bad_phrases", DEFAULT_BAD_PHRASES)
    min_line_length = config.get("min_line_length", 8)

    texts = []

    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue

        for child in node.find_all(["p", "div", "span", "br"]):
            text = child.get_text(" ", strip=True)
            if not text:
                continue
            if any(phrase in text for phrase in bad_phrases):
                continue
            if len(text) >= min_line_length:
                texts.append(text)

        direct_text = node.get_text("\n", strip=True)
        for line in direct_text.splitlines():
            line = line.strip()
            if not line:
                continue
            if any(phrase in line for phrase in bad_phrases):
                continue
            if len(line) >= min_line_length:
                texts.append(line)

        if texts:
            break

    seen = set()
    cleaned = []
    for text in texts:
        if text not in seen:
            seen.add(text)
            cleaned.append(text)

    return "\n".join(cleaned)


def find_next_url(soup: BeautifulSoup, current_url: str, config: dict) -> str | None:
    next_selector = config.get("next_selector")
    next_texts = config.get("next_link_texts", ["下一章", "Next", "Next Chapter"])

    if next_selector:
        node = soup.select_one(next_selector)
        if node and node.get("href"):
            return urljoin(current_url, node["href"])

    for anchor in soup.find_all("a", href=True):
        text = anchor.get_text(" ", strip=True)
        if any(label == text or label in text for label in next_texts):
            return urljoin(current_url, anchor["href"])

    return None


def save_single_file(output_path: Path, title: str, text: str) -> None:
    with output_path.open("a", encoding="utf-8") as out:
        out.write(f"{title}\n")
        out.write(f"{'=' * len(title)}\n")
        out.write(text)
        out.write("\n\n")


def save_separate_file(output_dir: Path, chapter_num: int, title: str, text: str) -> None:
    filename = f"{chapter_num:03d}_{sanitize_filename(title)}.txt"
    chapter_path = output_dir / filename
    with chapter_path.open("w", encoding="utf-8") as out:
        out.write(f"{title}\n")
        out.write(f"{'=' * len(title)}\n")
        out.write(text)
        out.write("\n")


def scrape(config: dict, args: argparse.Namespace) -> None:
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    start_url = args.start_url or config["start_url"]
    max_chapters = args.max_chapters or config.get("max_chapters", 5)
    delay = args.delay if args.delay is not None else config.get("delay_seconds", 1.5)
    output_mode = args.output_mode or config.get("output_mode", "single")
    output_dir = Path(args.output_dir or config.get("output_dir", "output"))
    output_dir.mkdir(parents=True, exist_ok=True)

    output_name = args.output_name or config.get("output_name", "novel.txt")
    single_output_path = output_dir / output_name

    if output_mode == "single" and single_output_path.exists():
        single_output_path.unlink()

    current_url = start_url
    seen_urls = set()

    for chapter_num in range(1, max_chapters + 1):
        if current_url in seen_urls:
            print("Stopped: loop detected.")
            break
        seen_urls.add(current_url)

        print(f"Scraping chapter {chapter_num}: {current_url}")

        try:
            soup = fetch_soup(session, current_url)
        except requests.RequestException as exc:
            print(f"Request failed: {exc}")
            break

        title = extract_title(soup, config.get("title_selector"), f"Chapter {chapter_num}")
        chapter_text = extract_text(soup, config)

        if not chapter_text or len(chapter_text) < config.get("min_chapter_length", 100):
            print("Could not extract enough chapter text.")
            break

        if output_mode == "separate":
            save_separate_file(output_dir, chapter_num, title, chapter_text)
        else:
            save_single_file(single_output_path, title, chapter_text)

        next_url = find_next_url(soup, current_url, config)
        if not next_url:
            print("No next chapter found.")
            break

        current_url = next_url
        time.sleep(delay)

    if output_mode == "single":
        print(f"Saved to {single_output_path}")
    else:
        print(f"Saved chapter files to {output_dir}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Configurable novel scraper")
    parser.add_argument("--config", required=True, help="Path to site config JSON")
    parser.add_argument("--start-url", help="Override the config start URL")
    parser.add_argument("--max-chapters", type=int, help="Override the number of chapters to scrape")
    parser.add_argument("--delay", type=float, help="Override the delay between requests")
    parser.add_argument(
        "--output-mode",
        choices=["single", "separate"],
        help="Save all chapters in one file or one file per chapter",
    )
    parser.add_argument("--output-dir", help="Directory for output files")
    parser.add_argument("--output-name", help="Output filename for single-file mode")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    try:
        config = load_config(args.config)
    except FileNotFoundError:
        print("Config file not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print("Config file is not valid JSON.")
        sys.exit(1)

    scrape(config, args)


if __name__ == "__main__":
    main()
