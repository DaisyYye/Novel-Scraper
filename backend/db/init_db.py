from __future__ import annotations

from sqlalchemy import inspect, text

from backend.core.config import settings
from backend.db.base import Base
from backend.db.session import engine
from backend.models import chapter, novel, reader, user  # noqa: F401


def _reader_tables_need_migration() -> bool:
    inspector = inspect(engine)
    if "reader_settings" in inspector.get_table_names():
        reader_settings_columns = {column["name"] for column in inspector.get_columns("reader_settings")}
        if "user_id" not in reader_settings_columns:
            return True

    if "reading_progress" in inspector.get_table_names():
        reading_progress_columns = {column["name"] for column in inspector.get_columns("reading_progress")}
        if "user_id" not in reading_progress_columns:
            return True

    return False


def _migrate_reader_tables() -> None:
    if not _reader_tables_need_migration():
        return

    with engine.begin() as connection:
        table_names = set(inspect(connection).get_table_names())
        if "reader_settings" in table_names:
            connection.execute(text("ALTER TABLE reader_settings RENAME TO reader_settings_legacy"))
        if "reading_progress" in table_names:
            connection.execute(text("ALTER TABLE reading_progress RENAME TO reading_progress_legacy"))


def init_db() -> None:
    settings.backend_data_dir.mkdir(parents=True, exist_ok=True)
    _migrate_reader_tables()
    Base.metadata.create_all(bind=engine)
