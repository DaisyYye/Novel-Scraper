import argparse

from backend.db.init_db import init_db
from backend.db.session import SessionLocal
from backend.services.importer import import_novel_from_file


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import a structured novel JSON file into SQLite.",
    )
    parser.add_argument("file", help="Path to a structured novel JSON file.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    init_db()
    db = SessionLocal()
    try:
        novel = import_novel_from_file(db, args.file)
        print(f"Imported novel: {novel.title} ({novel.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
