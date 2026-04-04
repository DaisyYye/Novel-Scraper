import argparse
import base64
import importlib.util
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import md5
from pathlib import Path
from urllib.parse import urljoin, urlparse

PROJECT_PACKAGES = Path(__file__).with_name(".python_packages")
if PROJECT_PACKAGES.exists():
    sys.path.append(str(PROJECT_PACKAGES))

import requests


def load_project_package(package_name: str):
    package_init = PROJECT_PACKAGES / package_name / "__init__.py"
    if not package_init.exists():
        raise ImportError(f"Could not find local package for {package_name}")

    spec = importlib.util.spec_from_file_location(
        package_name,
        package_init,
        submodule_search_locations=[str(package_init.parent)],
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load package spec for {package_name}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[package_name] = module
    spec.loader.exec_module(module)
    return module


try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = load_project_package("bs4").BeautifulSoup

try:
    from Crypto.Cipher import AES
except ImportError:
    load_project_package("Crypto")
    from Crypto.Cipher import AES

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

INVISIBLE_CHARS_RE = re.compile(r"[\u200b-\u200f\u2060\ufeff]")


def load_config(config_path: str) -> dict:
    resolved_path = resolve_config_path(config_path)
    with open(resolved_path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_config_path(config_path: str) -> Path:
    path = Path(config_path)
    if path.exists():
        return path

    fallback = Path("configs") / path.name
    if fallback.exists():
        return fallback

    return path


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[\\/*?:"<>|]', "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name or "novel"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "novel"


def build_novel_id(title: str, source_url: str | None = None) -> str:
    base = source_url or title
    digest = md5(base.encode("utf-8")).hexdigest()[:12]
    return f"{slugify(title)}-{digest}"


def build_chapter_id(novel_id: str, chapter_number: int) -> str:
    return f"{novel_id}-ch-{chapter_number:04d}"


def count_words(content: str) -> int:
    return len([part for part in content.split() if part.strip()])


def request_with_retries(
    session: requests.Session,
    url: str,
    timeout: int = 20,
    retries: int = 3,
    backoff: float = 1.0,
) -> requests.Response:
    last_exc: requests.RequestException | None = None

    for attempt in range(retries):
        try:
            response = session.get(url, timeout=timeout)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_exc = exc
            if attempt == retries - 1:
                break
            time.sleep(backoff * (2**attempt))

    raise last_exc if last_exc else requests.RequestException(f"Failed to fetch {url}")


def fetch_soup(session: requests.Session, url: str) -> BeautifulSoup:
    response = request_with_retries(session, url)
    response.encoding = response.encoding or response.apparent_encoding or "utf-8"
    return BeautifulSoup(response.text, "html.parser")


def fetch_text(session: requests.Session, url: str) -> str:
    response = request_with_retries(session, url)
    response.encoding = response.encoding or response.apparent_encoding or "utf-8"
    return response.text


def create_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)
    return session


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


def decrypt_lenglengbb_html(html: str) -> str | None:
    match = re.search(r"""\.html\(d\("([^"]+)",\s*"([0-9a-fA-F]{32})"\)\)""", html)
    if not match:
        return None

    encrypted_b64, secret = match.groups()
    digest = md5(secret.encode("utf-8")).hexdigest()
    iv = digest[:16].encode("utf-8")
    key = digest[16:].encode("utf-8")

    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    decrypted = cipher.decrypt(base64.b64decode(encrypted_b64))
    pad_len = decrypted[-1]
    if 1 <= pad_len <= AES.block_size:
        decrypted = decrypted[:-pad_len]

    return decrypted.decode("utf-8", errors="ignore")


def build_soup(session: requests.Session, url: str) -> BeautifulSoup:
    html = fetch_text(session, url)
    soup = BeautifulSoup(html, "html.parser")

    encrypted_domains = {
        "lenglengbb.com",
        "www.lenglengbb.com",
        "shibashuwu.net",
        "www.shibashuwu.net",
    }
    if urlparse(url).netloc in encrypted_domains:
        decrypted_html = decrypt_lenglengbb_html(html)
        if decrypted_html:
            content_selectors = [
                ".RBGsectionThree-content",
                "#C0NTENT",
            ]
            for selector in content_selectors:
                content_node = soup.select_one(selector)
                if not content_node:
                    continue
                content_node.clear()
                decrypted_soup = BeautifulSoup(decrypted_html, "html.parser")
                for child in list(decrypted_soup.contents):
                    content_node.append(child)
                break

    return soup


def normalize_title(title: str) -> str:
    title = INVISIBLE_CHARS_RE.sub("", title)
    title = title.strip().rstrip("_")
    title = re.sub(r"\s*\(\d+\s*/\s*\d+\)\s*$", "", title)
    return title.strip()


def extract_title_number(title: str) -> int | None:
    match = re.match(r"\s*(\d+)\b", title)
    if not match:
        return None
    return int(match.group(1))


def clean_line(text: str) -> str:
    text = INVISIBLE_CHARS_RE.sub("", text)
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
        for br in block.find_all("br"):
            br.replace_with("\n")

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

    entries = []
    seen = set()
    seen_catalog_pages = set()
    chapter_sort_attr = config.get("chapter_sort_attr")
    current_list_url = chapter_list_url
    chapter_list_next_selector = config.get("chapter_list_next_selector")

    while current_list_url and current_list_url not in seen_catalog_pages:
        seen_catalog_pages.add(current_list_url)
        soup = fetch_soup(session, current_list_url)

        for node in soup.select(chapter_link_selector):
            href = node.get("href")
            data_href_attr = config.get("chapter_link_data_attr")
            if data_href_attr and node.get(data_href_attr):
                try:
                    href = base64.b64decode(node[data_href_attr]).decode("utf-8")
                except Exception:
                    href = node.get("href")
            if not href:
                continue
            chapter_url = urljoin(current_list_url, href)
            if chapter_url in seen:
                continue
            seen.add(chapter_url)

            sort_value = None
            if chapter_sort_attr:
                current = node
                while current is not None:
                    if getattr(current, "attrs", None) and current.get(chapter_sort_attr) is not None:
                        sort_value = current.get(chapter_sort_attr)
                        break
                    current = getattr(current, "parent", None)

            try:
                sort_key = int(sort_value) if sort_value is not None else len(entries)
            except ValueError:
                sort_key = len(entries)

            entries.append((sort_key, chapter_url))

        if not chapter_list_next_selector:
            break

        next_node = soup.select_one(chapter_list_next_selector)
        next_href = next_node.get("href") if next_node else None
        current_list_url = urljoin(current_list_url, next_href) if next_href else None

    entries.sort(key=lambda item: item[0])
    urls = [chapter_url for _, chapter_url in entries]

    if config.get("chapter_link_order") == "desc":
        urls.reverse()

    return urls


def scrape_chapter(
    chapter_url: str,
    chapter_num: int,
    config: dict,
    delay: float,
    session: requests.Session | None = None,
) -> tuple[int, str, str] | None:
    owns_session = session is None
    if session is None:
        session = create_session()

    current_url = chapter_url
    seen_urls = set()
    text_chunks = []
    title = f"Chapter {chapter_num}"

    try:
        while current_url and current_url not in seen_urls:
            seen_urls.add(current_url)
            soup = build_soup(session, current_url)

            if title == f"Chapter {chapter_num}":
                title = normalize_title(extract_title(soup, config.get("title_selector"), title))

            chapter_text = extract_text(soup, config)
            if chapter_text:
                text_chunks.append(chapter_text)

            next_url = find_next_url(soup, current_url, config)
            if not next_url or not is_same_chapter_page(chapter_url, next_url):
                break

            current_url = next_url
            if delay > 0:
                time.sleep(delay)
    finally:
        if owns_session:
            session.close()

    combined_text = "\n\n\n".join(chunk for chunk in text_chunks if chunk).strip()
    if not combined_text:
        return None

    return chapter_num, title, combined_text


def save_single_file(output_path: Path, title: str, text: str) -> None:
    with output_path.open("a", encoding="utf-8") as out:
        out.write(f"{title}\n")
        out.write(f"{'=' * len(title)}\n")
        out.write("\n")
        out.write(text)
        out.write("\n\n\n")


def save_separate_file(output_dir: Path, chapter_num: int, title: str, text: str) -> None:
    filename = f"{chapter_num:03d}_{sanitize_filename(title)}.txt"
    chapter_path = output_dir / filename
    with chapter_path.open("w", encoding="utf-8") as out:
        out.write(f"{title}\n")
        out.write(f"{'=' * len(title)}\n")
        out.write("\n")
        out.write(text)
        out.write("\n")


def build_novel_payload(
    config: dict,
    output_name: str,
    chapters: list[dict[str, object]],
) -> dict[str, object]:
    source_url = config.get("source_url") or config.get("chapter_list_url") or config.get("start_url")
    title = (
        config.get("novel_title")
        or config.get("title")
        or Path(output_name).stem.replace("_", " ").strip()
        or "Novel"
    )
    novel_id = config.get("novel_id") or build_novel_id(title, source_url)

    normalized_chapters = []
    for chapter in chapters:
        chapter_number = int(chapter["chapter_number"])
        normalized_chapters.append(
            {
                "id": chapter.get("id") or build_chapter_id(novel_id, chapter_number),
                "chapter_number": chapter_number,
                "title": str(chapter["title"]),
                "content": str(chapter["content"]),
                "word_count": int(chapter.get("word_count") or count_words(str(chapter["content"]))),
                "source_url": chapter.get("source_url"),
            }
        )

    return {
        "id": novel_id,
        "slug": config.get("slug") or slugify(title),
        "title": title,
        "author": config.get("author"),
        "description": config.get("description"),
        "source_site": config.get("site_name"),
        "source_url": source_url,
        "status": config.get("status", "ongoing"),
        "cover_url": config.get("cover_url"),
        "tags": list(config.get("tags", [])),
        "chapters": normalized_chapters,
    }


def save_structured_exports(
    output_dir: Path,
    json_output_name: str,
    novel_payload: dict[str, object],
) -> tuple[Path, Path]:
    json_path = output_dir / json_output_name
    chapter_dir = output_dir / sanitize_filename(Path(json_output_name).stem) / "chapters"
    chapter_dir.mkdir(parents=True, exist_ok=True)

    json_path.write_text(
        json.dumps(novel_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    for chapter in novel_payload["chapters"]:
        chapter_number = int(chapter["chapter_number"])
        chapter_path = chapter_dir / f"{chapter_number:03d}.json"
        chapter_document = {
            "id": chapter["id"],
            "novel_id": novel_payload["id"],
            "chapter_number": chapter_number,
            "title": chapter["title"],
            "content": chapter["content"],
            "word_count": chapter["word_count"],
            "source_url": chapter["source_url"],
        }
        chapter_path.write_text(
            json.dumps(chapter_document, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return json_path, chapter_dir


def scrape(config: dict, args: argparse.Namespace) -> None:
    session = create_session()

    delay = args.delay if args.delay is not None else config.get("delay_seconds", 1.5)
    workers = max(1, args.workers or config.get("workers", 1))
    export_format = args.export_format or config.get("export_format", "json")
    txt_output_mode = args.output_mode or config.get("output_mode", "single")
    legacy_output_dir = args.output_dir or config.get("output_dir")
    json_output_dir = Path(
        args.json_output_dir
        or config.get("json_output_dir")
        or legacy_output_dir
        or "data/raw"
    )
    text_output_dir = Path(
        args.text_output_dir
        or config.get("text_output_dir")
        or legacy_output_dir
        or "data/exports"
    )
    json_output_dir.mkdir(parents=True, exist_ok=True)
    if export_format in {"txt", "json+txt"}:
        text_output_dir.mkdir(parents=True, exist_ok=True)

    txt_output_name = args.output_name or config.get("output_name", "novel.txt")
    json_output_name = args.json_output_name or config.get("json_output_name", "novel.json")
    single_output_path = text_output_dir / txt_output_name

    if export_format in {"txt", "json+txt"} and txt_output_mode == "single" and single_output_path.exists():
        single_output_path.unlink()

    follow_next_chapters = config.get("follow_next_chapters", False)
    max_chapters = args.max_chapters or config.get("max_chapters")

    if follow_next_chapters:
        current_url = args.start_url or config["start_url"]
        if not max_chapters:
            max_chapters = 100

        seen_urls = set()
        seen_title_numbers = set()
        saved_chapters = 0
        dedupe_by_title_number = config.get("dedupe_by_title_number", False)
        structured_chapters: list[dict[str, object]] = []

        while current_url:
            if current_url in seen_urls:
                print("Stopped: loop detected.")
                break
            seen_urls.add(current_url)
            print(f"Scraping page {len(seen_urls)}: {current_url}")

            try:
                soup = build_soup(session, current_url)
            except requests.RequestException as exc:
                print(f"Request failed while following chapters: {exc}")
                session.close()
                return

            title = normalize_title(extract_title(soup, config.get("title_selector"), f"Chapter {saved_chapters + 1}"))
            chapter_text = extract_text(soup, config)
            min_chapter_length = config.get("min_chapter_length", 100)
            title_number = extract_title_number(title)

            if len(chapter_text) < min_chapter_length:
                print(f"Could not extract enough chapter text at {current_url}.")
                session.close()
                return

            is_duplicate_title_number = (
                dedupe_by_title_number
                and title_number is not None
                and title_number in seen_title_numbers
            )

            if is_duplicate_title_number:
                print(f"Skipping duplicate chapter title: {title}")
            else:
                saved_chapters += 1
                if title_number is not None:
                    seen_title_numbers.add(title_number)

                # Use scrape order as the stable backend chapter number.
                # Some sources reuse or reset visible title numbers, which breaks
                # unique ordering in the database if we trust the title alone.
                file_chapter_num = saved_chapters
                structured_chapters.append(
                    {
                        "chapter_number": file_chapter_num,
                        "title": title,
                        "content": chapter_text,
                        "source_url": current_url,
                        "word_count": count_words(chapter_text),
                    }
                )

                if export_format in {"txt", "json+txt"}:
                    if txt_output_mode == "separate":
                        save_separate_file(text_output_dir, file_chapter_num, title, chapter_text)
                    else:
                        save_single_file(single_output_path, title, chapter_text)

                if dedupe_by_title_number and title_number is not None:
                    if title_number >= max_chapters:
                        break
                elif saved_chapters >= max_chapters:
                    break

            next_url = find_next_url(soup, current_url, config)
            if not next_url:
                break

            current_url = next_url
            if delay > 0:
                time.sleep(delay)

        session.close()
        novel_payload = build_novel_payload(config, json_output_name, structured_chapters)
        json_path, chapter_json_dir = save_structured_exports(json_output_dir, json_output_name, novel_payload)
        print(f"Saved structured novel JSON to {json_path}")
        print(f"Saved structured chapter JSON to {chapter_json_dir}")
        if export_format in {"txt", "json+txt"}:
            if txt_output_mode == "single":
                print(f"Saved text export to {single_output_path}")
            else:
                print(f"Saved text chapter files to {text_output_dir}")
        return

    try:
        chapter_urls = collect_chapter_urls(session, config, args.start_url)
    except requests.RequestException as exc:
        print(f"Failed to load chapter list: {exc}")
        return

    if not chapter_urls:
        print("No chapter URLs found.")
        return

    max_chapters = max_chapters or len(chapter_urls)

    min_chapter_length = config.get("min_chapter_length", 100)
    chapter_targets = list(enumerate(chapter_urls[:max_chapters], start=1))
    scraped_chapters: dict[int, tuple[str, str]] = {}
    chapter_source_urls = {chapter_num: chapter_url for chapter_num, chapter_url in chapter_targets}

    if workers == 1:
        for chapter_num, chapter_url in chapter_targets:
            print(f"Scraping chapter {chapter_num}: {chapter_url}")

            try:
                chapter_data = scrape_chapter(chapter_url, chapter_num, config, delay, session=session)
            except requests.RequestException as exc:
                print(f"Request failed for chapter {chapter_num}: {exc}")
                session.close()
                return

            if not chapter_data:
                print(f"Could not extract chapter text for chapter {chapter_num}.")
                session.close()
                return

            _, title, chapter_text = chapter_data
            if len(chapter_text) < min_chapter_length:
                print(f"Could not extract enough chapter text for chapter {chapter_num}.")
                session.close()
                return

            scraped_chapters[chapter_num] = (title, chapter_text)
    else:
        session.close()
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {}
            for chapter_num, chapter_url in chapter_targets:
                print(f"Queueing chapter {chapter_num}: {chapter_url}")
                future = executor.submit(scrape_chapter, chapter_url, chapter_num, config, delay)
                future_map[future] = chapter_num

            for future in as_completed(future_map):
                chapter_num = future_map[future]
                try:
                    chapter_data = future.result()
                except requests.RequestException as exc:
                    print(f"Request failed for chapter {chapter_num}: {exc}")
                    return

                if not chapter_data:
                    print(f"Could not extract chapter text for chapter {chapter_num}.")
                    return

                _, title, chapter_text = chapter_data
                if len(chapter_text) < min_chapter_length:
                    print(f"Could not extract enough chapter text for chapter {chapter_num}.")
                    return

                scraped_chapters[chapter_num] = (title, chapter_text)
                print(f"Finished chapter {chapter_num}")

    for chapter_num in sorted(scraped_chapters):
        title, chapter_text = scraped_chapters[chapter_num]
        if export_format in {"txt", "json+txt"}:
            if txt_output_mode == "separate":
                save_separate_file(text_output_dir, chapter_num, title, chapter_text)
            else:
                save_single_file(single_output_path, title, chapter_text)

    if workers == 1:
        session.close()

    structured_chapters = [
        {
            "chapter_number": chapter_num,
            "title": scraped_chapters[chapter_num][0],
            "content": scraped_chapters[chapter_num][1],
            "source_url": chapter_source_urls.get(chapter_num),
            "word_count": count_words(scraped_chapters[chapter_num][1]),
        }
        for chapter_num in sorted(scraped_chapters)
    ]
    novel_payload = build_novel_payload(config, json_output_name, structured_chapters)
    json_path, chapter_json_dir = save_structured_exports(json_output_dir, json_output_name, novel_payload)

    print(f"Saved structured novel JSON to {json_path}")
    print(f"Saved structured chapter JSON to {chapter_json_dir}")
    if export_format in {"txt", "json+txt"}:
        if txt_output_mode == "single":
            print(f"Saved text export to {single_output_path}")
        else:
            print(f"Saved text chapter files to {text_output_dir}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Configurable novel scraper")
    parser.add_argument("--config", required=True, help="Path to site config JSON")
    parser.add_argument("--start-url", help="Override the config start URL")
    parser.add_argument("--max-chapters", type=int, help="Override the number of chapters to scrape")
    parser.add_argument("--delay", type=float, help="Override the delay between requests")
    parser.add_argument("--workers", type=int, help="Number of chapters to fetch in parallel")
    parser.add_argument(
        "--export-format",
        choices=["json", "json+txt", "txt"],
        help="Primary export format. JSON is import-ready; TXT is optional.",
    )
    parser.add_argument(
        "--output-mode",
        choices=["single", "separate"],
        help="TXT export layout when TXT output is enabled",
    )
    parser.add_argument("--output-dir", help="Legacy shared output directory for both JSON and TXT")
    parser.add_argument("--json-output-dir", help="Directory for structured JSON output")
    parser.add_argument("--text-output-dir", help="Directory for TXT exports")
    parser.add_argument("--output-name", help="Output filename for single-file mode")
    parser.add_argument("--json-output-name", help="Output filename for the structured novel JSON")
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
