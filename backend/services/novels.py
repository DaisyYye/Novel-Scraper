from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Chapter, Novel
from backend.schemas.novels import (
    ChapterCreate,
    ChapterDetail,
    ChapterNavigation,
    ChapterSummary,
    ChapterUpdate,
    NovelDetail,
    NovelSummary,
    NovelUpdate,
)
from backend.services.utils import loads_tags
from backend.services.utils import build_chapter_id


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


def delete_novel_or_404(db: Session, novel_id: str) -> None:
    novel = get_novel_or_404(db, novel_id)
    db.delete(novel)
    db.commit()


def update_novel_metadata_or_404(
    db: Session,
    novel_id: str,
    payload: NovelUpdate,
) -> NovelDetail:
    novel = get_novel_or_404(db, novel_id)
    novel.title = payload.title.strip()
    novel.author = payload.author.strip() if payload.author else None
    novel.description = payload.description.strip() if payload.description else None
    db.add(novel)
    db.commit()
    db.refresh(novel)
    return serialize_novel_detail(novel)


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


def create_chapter_or_404(
    db: Session,
    novel_id: str,
    payload: ChapterCreate,
) -> ChapterDetail:
    novel = get_novel_or_404(db, novel_id)
    existing = db.scalar(
        select(Chapter).where(
            Chapter.novel_id == novel_id,
            Chapter.chapter_number == payload.chapter_number,
        )
    )
    if existing:
        raise ValueError("A chapter with this number already exists.")

    chapter = Chapter(
        id=build_chapter_id(novel_id, payload.chapter_number),
        novel_id=novel_id,
        chapter_number=payload.chapter_number,
        title=payload.title.strip(),
        content=payload.content,
        source_url=payload.source_url,
        word_count=len(payload.content.split()),
    )
    db.add(chapter)
    db.flush()
    novel.chapter_count = db.query(Chapter).filter(Chapter.novel_id == novel_id).count()
    db.add(novel)
    db.commit()
    db.refresh(chapter)
    return serialize_chapter_detail(chapter)


def update_chapter_or_404(
    db: Session,
    novel_id: str,
    chapter_id: str,
    payload: ChapterUpdate,
) -> ChapterDetail:
    chapter = get_chapter_or_404(db, novel_id, chapter_id)
    chapter.title = payload.title.strip()
    chapter.content = payload.content
    chapter.source_url = payload.source_url
    chapter.word_count = len(payload.content.split())
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return serialize_chapter_detail(chapter)


def delete_chapter_or_404(db: Session, novel_id: str, chapter_id: str) -> None:
    chapter = get_chapter_or_404(db, novel_id, chapter_id)
    novel = get_novel_or_404(db, novel_id)
    db.delete(chapter)
    db.flush()
    novel.chapter_count = db.query(Chapter).filter(Chapter.novel_id == novel_id).count()
    db.add(novel)
    db.commit()


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
