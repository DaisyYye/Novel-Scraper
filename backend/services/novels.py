from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Chapter, Novel
from backend.schemas.novels import (
    ChapterDetail,
    ChapterNavigation,
    ChapterSummary,
    NovelDetail,
    NovelSummary,
)
from backend.services.utils import loads_tags


def serialize_novel_summary(novel: Novel) -> NovelSummary:
    return NovelSummary(
        id=novel.id,
        slug=novel.slug,
        title=novel.title,
        author=novel.author,
        description=novel.description,
        source_site=novel.source_site,
        source_url=novel.source_url,
        status=novel.status,
        cover_url=novel.cover_url,
        tags=loads_tags(novel.tags_json),
        chapter_count=novel.chapter_count,
        created_at=novel.created_at,
        updated_at=novel.updated_at,
    )


def serialize_novel_detail(novel: Novel) -> NovelDetail:
    return NovelDetail(**serialize_novel_summary(novel).model_dump())


def serialize_chapter_summary(chapter: Chapter) -> ChapterSummary:
    return ChapterSummary(
        id=chapter.id,
        chapter_number=chapter.chapter_number,
        title=chapter.title,
        word_count=chapter.word_count,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


def serialize_chapter_detail(chapter: Chapter) -> ChapterDetail:
    return ChapterDetail(
        id=chapter.id,
        novel_id=chapter.novel_id,
        chapter_number=chapter.chapter_number,
        title=chapter.title,
        content=chapter.content,
        word_count=chapter.word_count,
        source_url=chapter.source_url,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


def list_novels(db: Session, query: str | None = None) -> list[NovelSummary]:
    statement = select(Novel).order_by(Novel.updated_at.desc(), Novel.title.asc())
    novels = list(db.scalars(statement))

    if query:
        needle = query.strip().lower()
        novels = [
            novel
            for novel in novels
            if needle in " ".join(
                [
                    novel.title,
                    novel.author or "",
                    novel.description or "",
                    " ".join(loads_tags(novel.tags_json)),
                ]
            ).lower()
        ]

    return [serialize_novel_summary(novel) for novel in novels]


def get_novel_or_404(db: Session, novel_id: str) -> Novel:
    novel = db.get(Novel, novel_id)
    if not novel:
        raise ValueError("Novel not found.")
    return novel


def get_chapter_or_404(db: Session, novel_id: str, chapter_id: str) -> Chapter:
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise ValueError("Chapter not found.")
    return chapter


def list_chapters_for_novel(db: Session, novel_id: str) -> list[ChapterSummary]:
    statement = (
        select(Chapter)
        .where(Chapter.novel_id == novel_id)
        .order_by(Chapter.chapter_number.asc())
    )
    chapters = list(db.scalars(statement))
    return [serialize_chapter_summary(chapter) for chapter in chapters]


def get_chapter_navigation(
    db: Session,
    novel_id: str,
    chapter_number: int,
) -> ChapterNavigation:
    chapters = list(
        db.scalars(
            select(Chapter)
            .where(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number.asc())
        )
    )

    previous_id = None
    next_id = None

    for index, chapter in enumerate(chapters):
        if chapter.chapter_number != chapter_number:
            continue
        if index > 0:
            previous_id = chapters[index - 1].id
        if index < len(chapters) - 1:
            next_id = chapters[index + 1].id
        break

    return ChapterNavigation(
        previous_chapter_id=previous_id,
        next_chapter_id=next_id,
    )
