from backend.core.config import settings
from backend.db.init_db import init_db
from backend.db.session import SessionLocal
from backend.services.importer import import_novel_from_file


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        sample_file = settings.sample_data_dir / "sample_novel.json"
        novel = import_novel_from_file(db, sample_file)
        print(f"Seeded novel: {novel.title} ({novel.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
