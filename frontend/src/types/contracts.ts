import type {
  ChapterContent,
  ChapterSummary,
  NovelDetail,
  NovelSummary,
  ReaderSettings,
  ReadingProgress,
} from "./domain";

export type NovelSearchResult = NovelSummary;

export type CreateNovelInput = {
  title: string;
  author: string;
  description: string;
  tags?: string[];
  sourceSite?: string;
  sourceUrl?: string;
};

export type UpdateNovelInput = {
  title: string;
  author?: string;
  description?: string;
};

export type ImportNovelInput = {
  novel: {
    id?: string;
    slug?: string;
    title: string;
    author?: string;
    description?: string;
    sourceSite?: string;
    sourceUrl?: string;
    status?: "ongoing" | "completed" | "hiatus";
    coverUrl?: string | null;
    tags?: string[];
  };
  chapters: Array<{
    id?: string;
    chapterNumber: number;
    title: string;
    content: string;
    sourceUrl?: string;
  }>;
};

export type ImportNovelResult = {
  novel: NovelDetail;
  importedChapterCount: number;
};

export type ReaderAppService = {
  getNovels(): Promise<NovelSummary[]>;
  deleteNovel(novelId: string): Promise<void>;
  updateNovel(novelId: string, input: UpdateNovelInput): Promise<NovelSummary>;
  getNovelById(novelId: string): Promise<NovelDetail>;
  getChapters(novelId: string): Promise<ChapterSummary[]>;
  getChapter(novelId: string, chapterId: string): Promise<ChapterContent>;
  getReaderSettings(): Promise<ReaderSettings>;
  saveReaderSettings(settings: ReaderSettings): Promise<ReaderSettings>;
  getReadingProgress(novelId: string): Promise<ReadingProgress | null>;
  saveReadingProgress(
    novelId: string,
    progress: ReadingProgress,
  ): Promise<ReadingProgress>;
  searchNovels(query: string): Promise<NovelSearchResult[]>;
  createNovel(input: CreateNovelInput): Promise<NovelDetail>;
  importNovel(input: ImportNovelInput): Promise<ImportNovelResult>;
};
