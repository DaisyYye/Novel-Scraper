import type {
  CreateNovelInput,
  ImportNovelInput,
  ImportNovelResult,
  ReaderAppService,
} from "../types/contracts";
import type {
  ChapterContent,
  ChapterSummary,
  NovelDetail,
  NovelSummary,
  ReaderSettings,
  ReadingProgress,
} from "../types/domain";

const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

type BackendNovelSummary = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  description: string | null;
  status: "ongoing" | "completed" | "hiatus";
  cover_url: string | null;
  tags: string[];
  chapter_count: number;
  updated_at: string;
};

type BackendNovelResponse = {
  novel: BackendNovelSummary;
};

type BackendChapterSummary = {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
};

type BackendChapterListResponse = {
  novel_id: string;
  items: BackendChapterSummary[];
};

type BackendChapterResponse = {
  chapter: {
    id: string;
    novel_id: string;
    chapter_number: number;
    title: string;
    content: string;
    word_count: number;
  };
  navigation: {
    previous_chapter_id: string | null;
    next_chapter_id: string | null;
  };
};

type BackendReaderSettings = {
  theme: "day" | "night" | "sepia";
  font_size: number;
  line_height: number;
  content_width: number;
  font_family: "serif" | "sans" | "literary";
  paragraph_spacing: number;
};

type BackendReaderSettingsResponse = {
  settings: BackendReaderSettings;
};

type BackendReadingProgress = {
  novel_id: string;
  chapter_id: string | null;
  chapter_number: number | null;
  scroll_position: number;
  last_read_at: string;
};

type BackendReadingProgressResponse = {
  progress: BackendReadingProgress | null;
};

type BackendNovelListResponse = {
  items: BackendNovelSummary[];
  total: number;
};

type BackendImportResponse = {
  novel: BackendNovelSummary;
  imported_chapter_count: number;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function mapNovelSummary(novel: BackendNovelSummary): NovelSummary {
  return {
    id: novel.id,
    slug: novel.slug,
    title: novel.title,
    author: novel.author ?? "Unknown author",
    description: novel.description ?? "",
    coverColor: "#c6b59f",
    status: novel.status,
    chapterCount: novel.chapter_count,
    updatedAt: novel.updated_at,
    tags: novel.tags,
  };
}

function mapChapterSummary(chapter: BackendChapterSummary): ChapterSummary {
  return {
    id: chapter.id,
    title: chapter.title,
    index: chapter.chapter_number,
    wordCount: chapter.word_count,
  };
}

function mapReaderSettings(settings: BackendReaderSettings): ReaderSettings {
  return {
    theme: settings.theme,
    fontSize: settings.font_size,
    lineHeight: settings.line_height,
    contentWidth: settings.content_width,
    fontFamily: settings.font_family,
    paragraphSpacing: settings.paragraph_spacing,
  };
}

function mapReadingProgress(progress: BackendReadingProgress): ReadingProgress {
  return {
    novelId: progress.novel_id,
    chapterId: progress.chapter_id ?? "",
    chapterIndex: progress.chapter_number ?? 1,
    scrollTop: progress.scroll_position,
    updatedAt: progress.last_read_at,
  };
}

function toBackendReaderSettings(settings: ReaderSettings): BackendReaderSettings {
  return {
    theme: settings.theme,
    font_size: settings.fontSize,
    line_height: settings.lineHeight,
    content_width: settings.contentWidth,
    font_family: settings.fontFamily,
    paragraph_spacing: settings.paragraphSpacing,
  };
}

function toBackendImportPayload(input: ImportNovelInput) {
  return {
    novel: {
      id: input.novel.id,
      slug: input.novel.slug,
      title: input.novel.title,
      author: input.novel.author,
      description: input.novel.description,
      source_site: input.novel.sourceSite,
      source_url: input.novel.sourceUrl,
      status: input.novel.status,
      cover_url: input.novel.coverUrl,
      tags: input.novel.tags ?? [],
    },
    chapters: input.chapters.map((chapter) => ({
      id: chapter.id,
      chapter_number: chapter.chapterNumber,
      title: chapter.title,
      content: chapter.content,
      source_url: chapter.sourceUrl,
    })),
  };
}

function mapNovelDetail(
  novel: BackendNovelSummary,
  chapters: BackendChapterSummary[],
): NovelDetail {
  return {
    novel: mapNovelSummary(novel),
    chapters: chapters.map(mapChapterSummary),
  };
}

function buildCreateNovelImport(input: CreateNovelInput): ImportNovelInput {
  return {
    novel: {
      title: input.title,
      author: input.author,
      description: input.description,
      sourceSite: input.sourceSite,
      sourceUrl: input.sourceUrl,
      status: "ongoing",
      tags: input.tags ?? [],
    },
    chapters: [],
  };
}

function createApiReaderAppService(): ReaderAppService {
  return {
    async getNovels() {
      const response = await apiRequest<BackendNovelListResponse>("/novels");
      return response.items.map(mapNovelSummary);
    },

    async getNovelById(novelId) {
      const [novelResponse, chaptersResponse] = await Promise.all([
        apiRequest<BackendNovelResponse>(`/novels/${novelId}`),
        apiRequest<BackendChapterListResponse>(`/novels/${novelId}/chapters`),
      ]);

      return mapNovelDetail(novelResponse.novel, chaptersResponse.items);
    },

    async getChapters(novelId) {
      const response = await apiRequest<BackendChapterListResponse>(`/novels/${novelId}/chapters`);
      return response.items.map(mapChapterSummary);
    },

    async getChapter(novelId, chapterId) {
      const response = await apiRequest<BackendChapterResponse>(
        `/novels/${novelId}/chapters/${chapterId}`,
      );

      return {
        id: response.chapter.id,
        novelId: response.chapter.novel_id,
        title: response.chapter.title,
        index: response.chapter.chapter_number,
        content: response.chapter.content,
      };
    },

    async getReaderSettings() {
      const response = await apiRequest<BackendReaderSettingsResponse>("/reader-settings");
      return mapReaderSettings(response.settings);
    },

    async saveReaderSettings(settings) {
      const response = await apiRequest<BackendReaderSettingsResponse>("/reader-settings", {
        method: "PUT",
        body: JSON.stringify({
          settings: toBackendReaderSettings(settings),
        }),
      });

      return mapReaderSettings(response.settings);
    },

    async getReadingProgress(novelId) {
      const response = await apiRequest<BackendReadingProgressResponse>(`/progress/${novelId}`);
      return response.progress ? mapReadingProgress(response.progress) : null;
    },

    async saveReadingProgress(novelId, progress) {
      const response = await apiRequest<BackendReadingProgressResponse>(`/progress/${novelId}`, {
        method: "PUT",
        body: JSON.stringify({
          chapter_id: progress.chapterId,
          chapter_number: progress.chapterIndex,
          scroll_position: progress.scrollTop,
          last_read_at: progress.updatedAt,
        }),
      });

      if (!response.progress) {
        throw new Error("The backend did not return progress.");
      }

      return mapReadingProgress(response.progress);
    },

    async searchNovels(query) {
      const search = new URLSearchParams({ q: query });
      const response = await apiRequest<BackendNovelListResponse>(`/novels?${search.toString()}`);
      return response.items.map(mapNovelSummary);
    },

    async createNovel(input) {
      const response = await apiRequest<BackendImportResponse>("/novels/import", {
        method: "POST",
        body: JSON.stringify(toBackendImportPayload(buildCreateNovelImport(input))),
      });

      return {
        novel: mapNovelSummary(response.novel),
        chapters: [],
      };
    },

    async importNovel(input) {
      const response = await apiRequest<BackendImportResponse>("/novels/import", {
        method: "POST",
        body: JSON.stringify(toBackendImportPayload(input)),
      });

      return {
        novel: {
          novel: mapNovelSummary(response.novel),
          chapters: [],
        },
        importedChapterCount: response.imported_chapter_count,
      } satisfies ImportNovelResult;
    },
  };
}

export const readerAppService = createApiReaderAppService();

export async function getNovels() {
  return readerAppService.getNovels();
}

export async function getNovelById(novelId: string) {
  return readerAppService.getNovelById(novelId);
}

export async function getChapters(novelId: string) {
  return readerAppService.getChapters(novelId);
}

export async function getChapter(novelId: string, chapterId: string) {
  return readerAppService.getChapter(novelId, chapterId);
}

export async function getReaderSettings() {
  return readerAppService.getReaderSettings();
}

export async function saveReaderSettings(settings: ReaderSettings) {
  return readerAppService.saveReaderSettings(settings);
}

export async function getReadingProgress(novelId: string) {
  return readerAppService.getReadingProgress(novelId);
}

export async function saveReadingProgress(novelId: string, progress: ReadingProgress) {
  return readerAppService.saveReadingProgress(novelId, progress);
}

export async function searchNovels(query: string) {
  return readerAppService.searchNovels(query);
}

export async function createNovel(input: CreateNovelInput) {
  return readerAppService.createNovel(input);
}

export async function importNovel(input: ImportNovelInput) {
  return readerAppService.importNovel(input);
}
