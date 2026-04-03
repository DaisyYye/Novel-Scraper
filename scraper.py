import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

PROJECT_PACKAGES = Path(__file__).with_name(".python_packages")
if PROJECT_PACKAGES.exists():
    sys.path.insert(0, str(PROJECT_PACKAGES))

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
    "本章阅读完毕",
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
    response.encoding = response.apparent_encoding or response.encoding
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


def normalize_title(title: str) -> str:
    title = title.strip().rstrip("_")
    title = re.sub(r"\s*\(\d+\s*/\s*\d+\)\s*$", "", title)
    return title.strip()


def clean_line(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_block(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")
    lines = [clean_line(line) for line in text.split("\n")]

    cleaned_lines = []
    previous_blank = False
    for line in lines:
        if not line:
            if not previous_blank:
                cleaned_lines.append("")
            previous_blank = True
            continue
        cleaned_lines.append(line)
        previous_blank = False

    return "\n".join(cleaned_lines).strip()


def extract_paragraphs(node: BeautifulSoup, bad_phrases: list[str], min_line_length: int) -> list[str]:
    paragraphs = []
    blocks = node.find_all("p") or [node]

    for block in blocks:
        raw_text = block.get_text("\n", strip=False)
        text = normalize_block(raw_text)
        if not text:
            continue

        kept_lines = []
        for line in text.split("\n"):
            stripped = line.strip()
            if stripped and any(phrase in stripped for phrase in bad_phrases):
                continue
            kept_lines.append(line)

        filtered_text = normalize_block("\n".join(kept_lines))
        if not filtered_text:
            continue

        compact_length = len(filtered_text.replace("\n", "").strip())
        if compact_length >= min_line_length:
            paragraphs.append(filtered_text)

    return paragraphs


def extract_text(soup: BeautifulSoup, config: dict) -> str:
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    selectors = config.get("content_selectors", [])
    bad_phrases = config.get("bad_phrases", DEFAULT_BAD_PHRASES)
    min_line_length = config.get("min_line_length", 8)
    paragraphs: list[str] = []

    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue

        paragraphs = extract_paragraphs(node, bad_phrases, min_line_length)
        if paragraphs:
            break

    seen = set()
    cleaned = []
    for text in paragraphs:
        if text not in seen:
            seen.add(text)
            cleaned.append(text)

    return "\n\n".join(cleaned)


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


def chapter_key(url: str) -> str:
    path = urlparse(url).path
    match = re.search(r"/([^/_]+)(?:_\d+)?\.html$", path)
    return match.group(1) if match else path


def is_same_chapter_page(start_url: str, next_url: str) -> bool:
    return chapter_key(start_url) == chapter_key(next_url)


def collect_chapter_urls(session: requests.Session, config: dict, start_url_override: str | None) -> list[str]:
    if start_url_override:
        return [start_url_override]

    chapter_list_url = config.get("chapter_list_url")
    chapter_link_selector = config.get("chapter_link_selector")
    if not chapter_list_url or not chapter_link_selector:
        return [config["start_url"]]

    soup = fetch_soup(session, chapter_list_url)
    urls = []
    seen = set()

    for node in soup.select(chapter_link_selector):
        href = node.get("href")
        if not href:
            continue
        chapter_url = urljoin(chapter_list_url, href)
        if chapter_url in seen:
            continue
        seen.add(chapter_url)
        urls.append(chapter_url)

    if config.get("chapter_link_order") == "desc":
        urls.reverse()

    return urls


def scrape_chapter(
    session: requests.Session,
    chapter_url: str,
    chapter_num: int,
    config: dict,
    delay: float,
) -> tuple[str, str] | None:
    current_url = chapter_url
    seen_urls = set()
    text_chunks = []
    title = f"Chapter {chapter_num}"

    while current_url and current_url not in seen_urls:
        seen_urls.add(current_url)
        soup = fetch_soup(session, current_url)

        if title == f"Chapter {chapter_num}":
            title = normalize_title(extract_title(soup, config.get("title_selector"), title))

        chapter_text = extract_text(soup, config)
        if chapter_text:
            text_chunks.append(chapter_text)

        next_url = find_next_url(soup, current_url, config)
        if not next_url or not is_same_chapter_page(chapter_url, next_url):
            break

        current_url = next_url
        time.sleep(delay)

    combined_text = "\n".join(chunk for chunk in text_chunks if chunk).strip()
    if not combined_text:
        return None

    return title, combined_text


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

    delay = args.delay if args.delay is not None else config.get("delay_seconds", 1.5)
    output_mode = args.output_mode or config.get("output_mode", "single")
    output_dir = Path(args.output_dir or config.get("output_dir", "output"))
    output_dir.mkdir(parents=True, exist_ok=True)

    output_name = args.output_name or config.get("output_name", "novel.txt")
    single_output_path = output_dir / output_name

    if output_mode == "single" and single_output_path.exists():
        single_output_path.unlink()

    try:
        chapter_urls = collect_chapter_urls(session, config, args.start_url)
    except requests.RequestException as exc:
        print(f"Failed to load chapter list: {exc}")
        return

    if not chapter_urls:
        print("No chapter URLs found.")
        return

    max_chapters = args.max_chapters or config.get("max_chapters") or len(chapter_urls)

    min_chapter_length = config.get("min_chapter_length", 100)

    for chapter_num, chapter_url in enumerate(chapter_urls[:max_chapters], start=1):
        print(f"Scraping chapter {chapter_num}: {chapter_url}")

        try:
            chapter_data = scrape_chapter(session, chapter_url, chapter_num, config, delay)
        except requests.RequestException as exc:
            print(f"Request failed: {exc}")
            break

        if not chapter_data:
            print("Could not extract chapter text.")
            break

        title, chapter_text = chapter_data
        if len(chapter_text) < min_chapter_length:
            print("Could not extract enough chapter text.")
            break

        if output_mode == "separate":
            save_separate_file(output_dir, chapter_num, title, chapter_text)
        else:
            save_single_file(single_output_path, title, chapter_text)

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
