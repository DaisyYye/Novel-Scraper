import json
import re
from hashlib import sha1


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "novel"


def build_novel_id(title: str, source_url: str | None = None) -> str:
    base = source_url or title
    digest = sha1(base.encode("utf-8")).hexdigest()[:12]
    return f"{slugify(title)}-{digest}"


def build_chapter_id(novel_id: str, chapter_number: int) -> str:
    return f"{novel_id}-ch-{chapter_number:04d}"


def count_words(content: str) -> int:
    return len([part for part in content.split() if part.strip()])


def dumps_tags(tags: list[str]) -> str:
    return json.dumps(tags, ensure_ascii=False)


def loads_tags(tags_json: str | None) -> list[str]:
    if not tags_json:
        return []

    try:
        data = json.loads(tags_json)
    except json.JSONDecodeError:
        return []

    if isinstance(data, list):
        return [str(item) for item in data]
    return []
