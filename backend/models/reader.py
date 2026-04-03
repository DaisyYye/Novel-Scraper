from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class ReaderSettings(Base):
    __tablename__ = "reader_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    theme: Mapped[str] = mapped_column(String(20), default="day")
    font_size: Mapped[int] = mapped_column(Integer, default=19)
    line_height: Mapped[float] = mapped_column(default=1.9)
    content_width: Mapped[int] = mapped_column(Integer, default=760)
    paragraph_spacing: Mapped[float] = mapped_column(default=1.35)
    font_family: Mapped[str] = mapped_column(String(50), default="literary")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    __table_args__ = (
        UniqueConstraint("novel_id", name="uq_progress_novel"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    novel_id: Mapped[str] = mapped_column(
        ForeignKey("novels.id", ondelete="CASCADE"),
        index=True,
    )
    chapter_id: Mapped[str | None] = mapped_column(
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
    )
    chapter_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scroll_position: Mapped[int] = mapped_column(Integer, default=0)
    last_read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    novel = relationship("Novel", back_populates="progress")
    chapter = relationship("Chapter", back_populates="progress_entries")
