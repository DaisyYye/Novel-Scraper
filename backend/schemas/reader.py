from datetime import datetime

from pydantic import Field

from backend.schemas.common import APIModel


class ReaderSettingsData(APIModel):
    theme: str = Field(default="day")
    font_size: int = Field(default=19, ge=12, le=40)
    line_height: float = Field(default=1.9, ge=1.0, le=3.0)
    content_width: int = Field(default=760, ge=320, le=1400)
    paragraph_spacing: float = Field(default=1.35, ge=0.5, le=4.0)
    font_family: str = Field(default="literary")


class ReaderSettingsResponse(APIModel):
    settings: ReaderSettingsData


class ReaderSettingsUpdate(APIModel):
    settings: ReaderSettingsData


class ReadingProgressData(APIModel):
    novel_id: str
    chapter_id: str | None = None
    chapter_number: int | None = None
    scroll_position: int = Field(default=0, ge=0)
    last_read_at: datetime


class ReadingProgressUpdate(APIModel):
    chapter_id: str | None = None
    chapter_number: int | None = None
    scroll_position: int = Field(default=0, ge=0)
    last_read_at: datetime | None = None


class ReadingProgressResponse(APIModel):
    progress: ReadingProgressData | None
