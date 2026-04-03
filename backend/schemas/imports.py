from pydantic import Field, model_validator

from backend.schemas.common import APIModel
from backend.schemas.novels import NovelDetail


class ImportedChapter(APIModel):
    id: str | None = None
    chapter_number: int
    title: str
    content: str
    word_count: int | None = None
    source_url: str | None = None


class ImportedNovel(APIModel):
    id: str | None = None
    slug: str | None = None
    title: str
    author: str | None = None
    description: str | None = None
    source_site: str | None = None
    source_url: str | None = None
    status: str = "ongoing"
    cover_url: str | None = None
    tags: list[str] = Field(default_factory=list)


class ScrapedNovelDocument(ImportedNovel):
    chapters: list[ImportedChapter] = Field(default_factory=list)


class NovelImportRequest(APIModel):
    file_path: str | None = None
    novel: ImportedNovel | None = None
    chapters: list[ImportedChapter] = Field(default_factory=list)
    document: ScrapedNovelDocument | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data

        if data.get("file_path"):
            return data

        if "novel" in data:
            chapters = data.get("chapters")
            if chapters is None and isinstance(data.get("novel"), dict):
                chapters = data["novel"].get("chapters", [])
            return {
                "novel": data["novel"],
                "chapters": chapters or [],
            }

        if "chapters" in data and "title" in data:
            return {"document": data}

        return data

    @model_validator(mode="after")
    def validate_input(self) -> "NovelImportRequest":
        has_file = bool(self.file_path)
        has_direct_payload = self.document is not None or self.novel is not None

        if has_file == has_direct_payload:
            raise ValueError("Provide either file_path or a structured novel payload.")

        return self

    def to_document(self) -> ScrapedNovelDocument:
        if self.document is not None:
            return self.document

        if self.novel is None:
            raise ValueError("No structured novel payload provided.")

        return ScrapedNovelDocument(
            **self.novel.model_dump(),
            chapters=[chapter.model_copy() for chapter in self.chapters],
        )


class NovelImportResponse(APIModel):
    novel: NovelDetail
    imported_chapter_count: int
