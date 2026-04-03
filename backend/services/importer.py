from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models import Chapter, Novel
from backend.schemas.imports import NovelImportRequest, ScrapedNovelDocument
from backend.schemas.novels import NovelDetail
from backend.services.novels import serialize_novel_detail
from backend.services.utils import (
    build_chapter_id,
    build_novel_id,
    count_words,
    dumps_tags,
    slugify,
)


def import_novel_document(db: Session, document: ScrapedNovelDocument) -> NovelDetail:
    novel_data = document
    novel_id = novel_data.id or build_novel_id(novel_data.title, novel_data.source_url)

    existing = db.get(Novel, novel_id)
    if not existing and novel_data.source_url:
        existing = db.scalar(select(Novel).where(Novel.source_url == novel_data.source_url))

    novel = existing or Novel(id=novel_id)
    novel.slug = novel_data.slug or slugify(novel_data.title)
    novel.title = novel_data.title
    novel.author = novel_data.author
    novel.description = novel_data.description
    novel.source_site = novel_data.source_site
    novel.source_url = novel_data.source_url
    novel.status = novel_data.status
    novel.cover_url = novel_data.cover_url
    novel.tags_json = dumps_tags(novel_data.tags)
    novel.chapter_count = len(document.chapters)

    db.add(novel)
    db.flush()

    existing_chapters = {
        chapter.chapter_number: chapter
        for chapter in db.scalars(
            select(Chapter).where(Chapter.novel_id == novel.id)
        )
    }

    seen_numbers: set[int] = set()
    for chapter_data in sorted(document.chapters, key=lambda chapter: chapter.chapter_number):
        seen_numbers.add(chapter_data.chapter_number)
        chapter = existing_chapters.get(chapter_data.chapter_number) or Chapter(
            id=chapter_data.id or build_chapter_id(novel.id, chapter_data.chapter_number),
            novel_id=novel.id,
            chapter_number=chapter_data.chapter_number,
        )

        chapter.title = chapter_data.title
        chapter.content = chapter_data.content
        chapter.word_count = chapter_data.word_count or count_words(chapter_data.content)
        chapter.source_url = chapter_data.source_url
        db.add(chapter)

    for chapter_number, chapter in existing_chapters.items():
        if chapter_number not in seen_numbers:
            db.delete(chapter)

    db.commit()
    db.refresh(novel)
    return serialize_novel_detail(novel)


def import_novel_from_file(db: Session, file_path: str | Path) -> NovelDetail:
    resolved_path = Path(file_path)
    if not resolved_path.is_absolute():
        candidate_paths = [
            settings.base_dir / resolved_path,
            settings.raw_data_dir / resolved_path.name,
            settings.export_data_dir / resolved_path.name,
            settings.sample_data_dir / resolved_path.name,
        ]
        resolved_path = next((path for path in candidate_paths if path.exists()), candidate_paths[0])

    if not resolved_path.exists():
        raise ValueError(f"Import file not found: {resolved_path}")

    payload = NovelImportRequest.model_validate_json(resolved_path.read_text(encoding="utf-8"))
    return import_novel_payload(db, payload)


def import_novel_payload(db: Session, payload: NovelImportRequest) -> NovelDetail:
    if payload.file_path:
        return import_novel_from_file(db, payload.file_path)

    return import_novel_document(db, payload.to_document())
