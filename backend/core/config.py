from pathlib import Path


class Settings:
    def __init__(self) -> None:
        self.project_name = "Novel Reader API"
        self.api_version = "0.1.0"
        self.base_dir = Path(__file__).resolve().parents[2]
        self.backend_data_dir = self.base_dir / "backend" / "data"
        self.database_path = self.backend_data_dir / "novel_reader.db"
        self.database_url = f"sqlite:///{self.database_path.as_posix()}"
        self.sample_data_dir = self.backend_data_dir / "sample_data"
        self.configs_dir = self.base_dir / "configs"
        self.raw_data_dir = self.base_dir / "data" / "raw"
        self.export_data_dir = self.base_dir / "data" / "exports"


settings = Settings()
