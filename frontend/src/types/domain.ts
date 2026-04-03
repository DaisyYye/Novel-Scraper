export type NovelSummary = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  coverColor: string;
  status: "ongoing" | "completed" | "hiatus";
  chapterCount: number;
  updatedAt: string;
  tags: string[];
};

export type ChapterSummary = {
  id: string;
  title: string;
  index: number;
  wordCount: number;
};

export type NovelDetail = {
  novel: NovelSummary;
  chapters: ChapterSummary[];
};

export type ChapterContent = {
  id: string;
  novelId: string;
  title: string;
  index: number;
  content: string;
};

export type ReaderTheme = "day" | "night" | "sepia";
export type ReaderFontFamily = "serif" | "sans" | "literary";

export type ReaderSettings = {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  fontFamily: ReaderFontFamily;
  paragraphSpacing: number;
};

export type ReadingProgress = {
  novelId: string;
  chapterId: string;
  chapterIndex: number;
  scrollTop: number;
  updatedAt: string;
};
