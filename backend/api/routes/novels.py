from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.schemas.imports import NovelImportRequest, NovelImportResponse
from backend.schemas.novels import (
    ChapterListResponse,
    ChapterResponse,
    NovelListResponse,
    NovelResponse,
)
from backend.services.importer import import_novel_payload
from backend.services.novels import (
    get_chapter_navigation,
    get_chapter_or_404,
    get_novel_or_404,
    list_chapters_for_novel,
    list_novels,
    serialize_chapter_detail,
    serialize_novel_detail,
)

router = APIRouter(tags=["novels"])


@router.get("/novels", response_model=NovelListResponse)
def get_novels(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> NovelListResponse:
    items = list_novels(db, query=q)
    return NovelListResponse(items=items, total=len(items))


@router.get("/novels/{novel_id}", response_model=NovelResponse)
def get_novel(novel_id: str, db: Session = Depends(get_db)) -> NovelResponse:
    try:
        novel = get_novel_or_404(db, novel_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return NovelResponse(novel=serialize_novel_detail(novel))


@router.get("/novels/{novel_id}/chapters", response_model=ChapterListResponse)
def get_novel_chapters(
    novel_id: str,
    db: Session = Depends(get_db),
) -> ChapterListResponse:
    try:
        get_novel_or_404(db, novel_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    items = list_chapters_for_novel(db, novel_id)
    return ChapterListResponse(novel_id=novel_id, items=items)


@router.get("/novels/{novel_id}/chapters/{chapter_id}", response_model=ChapterResponse)
def get_chapter(
    novel_id: str,
    chapter_id: str,
    db: Session = Depends(get_db),
) -> ChapterResponse:
    try:
        chapter = get_chapter_or_404(db, novel_id, chapter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    navigation = get_chapter_navigation(db, novel_id, chapter.chapter_number)
    return ChapterResponse(
        chapter=serialize_chapter_detail(chapter),
        navigation=navigation,
    )


@router.post(
    "/novels/import",
    response_model=NovelImportResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_novel(
    payload: NovelImportRequest,
    db: Session = Depends(get_db),
) -> NovelImportResponse:
    try:
        novel = import_novel_payload(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return NovelImportResponse(
        novel=novel,
        imported_chapter_count=novel.chapter_count,
    )
