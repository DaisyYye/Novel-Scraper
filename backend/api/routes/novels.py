from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user, require_admin
from backend.db.session import get_db
from backend.models import User
from backend.schemas.imports import NovelImportRequest, NovelImportResponse
from backend.schemas.novels import (
    ChapterCreateRequest,
    ChapterListResponse,
    ChapterResponse,
    ChapterUpdateRequest,
    NovelListResponse,
    NovelResponse,
    NovelUpdateRequest,
)
from backend.services.importer import import_novel_payload
from backend.services.novels import (
    create_chapter_or_404,
    delete_chapter_or_404,
    delete_novel_or_404,
    get_chapter_navigation,
    get_chapter_or_404,
    get_novel_or_404,
    list_chapters_for_novel,
    list_novels,
    serialize_chapter_detail,
    serialize_novel_detail,
    update_chapter_or_404,
    update_novel_metadata_or_404,
)

router = APIRouter(tags=["novels"])


@router.get("/novels", response_model=NovelListResponse)
def get_novels(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NovelListResponse:
    _ = current_user
    items = list_novels(db, query=q)
    return NovelListResponse(items=items, total=len(items))


@router.get("/novels/{novel_id}", response_model=NovelResponse)
def get_novel(
    novel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NovelResponse:
    _ = current_user
    try:
        novel = get_novel_or_404(db, novel_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return NovelResponse(novel=serialize_novel_detail(novel))


@router.put("/novels/{novel_id}", response_model=NovelResponse)
def update_novel(
    novel_id: str,
    payload: NovelUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> NovelResponse:
    _ = current_user
    try:
        novel = update_novel_metadata_or_404(db, novel_id, payload.novel)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return NovelResponse(novel=novel)


@router.delete("/novels/{novel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_novel(
    novel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    _ = current_user
    try:
        delete_novel_or_404(db, novel_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/novels/{novel_id}/chapters", response_model=ChapterListResponse)
def get_novel_chapters(
    novel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChapterListResponse:
    _ = current_user
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
    current_user: User = Depends(get_current_user),
) -> ChapterResponse:
    _ = current_user
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
    current_user: User = Depends(require_admin),
) -> NovelImportResponse:
    _ = current_user
    try:
        novel = import_novel_payload(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return NovelImportResponse(
        novel=novel,
        imported_chapter_count=novel.chapter_count,
    )


@router.post(
    "/novels/{novel_id}/chapters",
    response_model=ChapterResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_chapter(
    novel_id: str,
    payload: ChapterCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> ChapterResponse:
    _ = current_user
    try:
        chapter = create_chapter_or_404(db, novel_id, payload.chapter)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    navigation = get_chapter_navigation(db, novel_id, chapter.chapter_number)
    return ChapterResponse(chapter=chapter, navigation=navigation)


@router.put("/novels/{novel_id}/chapters/{chapter_id}", response_model=ChapterResponse)
def update_chapter(
    novel_id: str,
    chapter_id: str,
    payload: ChapterUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> ChapterResponse:
    _ = current_user
    try:
        chapter = update_chapter_or_404(db, novel_id, chapter_id, payload.chapter)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    navigation = get_chapter_navigation(db, novel_id, chapter.chapter_number)
    return ChapterResponse(chapter=chapter, navigation=navigation)


@router.delete(
    "/novels/{novel_id}/chapters/{chapter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_chapter(
    novel_id: str,
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    _ = current_user
    try:
        delete_chapter_or_404(db, novel_id, chapter_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
