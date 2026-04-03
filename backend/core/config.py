import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def _read_csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings:
    def __init__(self) -> None:
        self.project_name = "Novel Reader API"
        self.api_version = "0.1.0"
        self.base_dir = BASE_DIR
        self.backend_data_dir = self.base_dir / "backend" / "data"
        self.database_path = Path(
            os.getenv(
                "DATABASE_PATH",
                str(self.backend_data_dir / "novel_reader.db"),
            )
        )
        self.database_url = f"sqlite:///{self.database_path.as_posix()}"
        self.sample_data_dir = self.backend_data_dir / "sample_data"
        self.configs_dir = self.base_dir / "configs"
        self.raw_data_dir = self.base_dir / "data" / "raw"
        self.export_data_dir = self.base_dir / "data" / "exports"
        self.allowed_origins = _read_csv_env(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        )
        self.admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower() or None
        self.clerk_publishable_key = os.getenv("CLERK_PUBLISHABLE_KEY", "").strip()
        self.clerk_secret_key = os.getenv("CLERK_SECRET_KEY", "").strip()
        self.clerk_jwks_url = os.getenv("CLERK_JWKS_URL", "").strip()
        self.clerk_issuer = os.getenv("CLERK_ISSUER", "").strip()
        self.clerk_audience = os.getenv("CLERK_AUDIENCE", "").strip() or None


settings = Settings()
