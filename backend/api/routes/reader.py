from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.schemas.reader import (
    ReaderSettingsResponse,
    ReaderSettingsUpdate,
    ReadingProgressResponse,
    ReadingProgressUpdate,
)
from backend.services.novels import get_novel_or_404
from backend.services.reader import (
    get_reader_settings,
    get_reading_progress,
    update_reader_settings,
    update_reading_progress,
)

router = APIRouter(tags=["reader"])


@router.get("/reader-settings", response_model=ReaderSettingsResponse)
def fetch_reader_settings(db: Session = Depends(get_db)) -> ReaderSettingsResponse:
    settings = get_reader_settings(db)
    return ReaderSettingsResponse(settings=settings)


@router.put("/reader-settings", response_model=ReaderSettingsResponse)
def put_reader_settings(
    payload: ReaderSettingsUpdate,
    db: Session = Depends(get_db),
) -> ReaderSettingsResponse:
    settings = update_reader_settings(db, payload.settings)
    return ReaderSettingsResponse(settings=settings)


@router.get("/progress/{novel_id}", response_model=ReadingProgressResponse)
def fetch_reading_progress(
    novel_id: str,
    db: Session = Depends(get_db),
) -> ReadingProgressResponse:
    try:
        get_novel_or_404(db, novel_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    progress = get_reading_progress(db, novel_id)
    return ReadingProgressResponse(progress=progress)


@router.put("/progress/{novel_id}", response_model=ReadingProgressResponse)
def put_reading_progress(
    novel_id: str,
    payload: ReadingProgressUpdate,
    db: Session = Depends(get_db),
) -> ReadingProgressResponse:
    try:
        get_novel_or_404(db, novel_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    try:
        progress = update_reading_progress(db, novel_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ReadingProgressResponse(progress=progress)
