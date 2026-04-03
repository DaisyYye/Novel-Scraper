from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Chapter, ReaderSettings, ReadingProgress, User
from backend.schemas.reader import (
    ReaderSettingsData,
    ReadingProgressData,
    ReadingProgressUpdate,
)


def get_reader_settings(db: Session, user: User) -> ReaderSettingsData:
    settings = db.scalar(select(ReaderSettings).where(ReaderSettings.user_id == user.id))
    if not settings:
        settings = ReaderSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return ReaderSettingsData.model_validate(settings)


def update_reader_settings(db: Session, user: User, payload: ReaderSettingsData) -> ReaderSettingsData:
    settings = db.scalar(select(ReaderSettings).where(ReaderSettings.user_id == user.id))
    if not settings:
        settings = ReaderSettings(user_id=user.id)
        db.add(settings)

    settings.theme = payload.theme
    settings.font_size = payload.font_size
    settings.line_height = payload.line_height
    settings.content_width = payload.content_width
    settings.paragraph_spacing = payload.paragraph_spacing
    settings.font_family = payload.font_family

    db.commit()
    db.refresh(settings)
    return ReaderSettingsData.model_validate(settings)


def get_reading_progress(db: Session, user: User, novel_id: str) -> ReadingProgressData | None:
    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.novel_id == novel_id)
        .one_or_none()
    )

    if not progress:
        return None

    return ReadingProgressData.model_validate(progress)


def update_reading_progress(
    db: Session,
    user: User,
    novel_id: str,
    payload: ReadingProgressUpdate,
) -> ReadingProgressData:
    if payload.chapter_id:
        chapter = db.get(Chapter, payload.chapter_id)
        if not chapter or chapter.novel_id != novel_id:
            raise ValueError("Chapter not found for this novel.")

    progress = (
        db.query(ReadingProgress)
        .filter(ReadingProgress.user_id == user.id, ReadingProgress.novel_id == novel_id)
        .one_or_none()
    )

    if not progress:
        progress = ReadingProgress(user_id=user.id, novel_id=novel_id)
        db.add(progress)

    progress.chapter_id = payload.chapter_id
    progress.chapter_number = payload.chapter_number
    progress.scroll_position = payload.scroll_position
    progress.last_read_at = payload.last_read_at or datetime.now(timezone.utc)

    db.commit()
    db.refresh(progress)
    return ReadingProgressData.model_validate(progress)
