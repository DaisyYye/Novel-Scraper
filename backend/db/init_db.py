from backend.core.config import settings
from backend.db.base import Base
from backend.db.session import engine
from backend.models import chapter, novel, reader  # noqa: F401


def init_db() -> None:
    settings.backend_data_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
