from datetime import datetime

from backend.schemas.common import APIModel


class NovelSummary(APIModel):
    id: str
    slug: str
    title: str
    author: str | None = None
    description: str | None = None
    source_site: str | None = None
    source_url: str | None = None
    status: str
    cover_url: str | None = None
    tags: list[str]
    chapter_count: int
    created_at: datetime
    updated_at: datetime


class ChapterSummary(APIModel):
    id: str
    chapter_number: int
    title: str
    word_count: int
    created_at: datetime
    updated_at: datetime


class ChapterDetail(ChapterSummary):
    novel_id: str
    content: str
    source_url: str | None = None


class NovelDetail(APIModel):
    id: str
    slug: str
    title: str
    author: str | None = None
    description: str | None = None
    source_site: str | None = None
    source_url: str | None = None
    status: str
    cover_url: str | None = None
    tags: list[str]
    chapter_count: int
    created_at: datetime
    updated_at: datetime


class NovelListResponse(APIModel):
    items: list[NovelSummary]
    total: int


class NovelResponse(APIModel):
    novel: NovelDetail


class NovelUpdate(APIModel):
    title: str
    author: str | None = None
    description: str | None = None


class NovelUpdateRequest(APIModel):
    novel: NovelUpdate


class ChapterListResponse(APIModel):
    novel_id: str
    items: list[ChapterSummary]


class ChapterNavigation(APIModel):
    previous_chapter_id: str | None = None
    next_chapter_id: str | None = None


class ChapterResponse(APIModel):
    chapter: ChapterDetail
    navigation: ChapterNavigation
