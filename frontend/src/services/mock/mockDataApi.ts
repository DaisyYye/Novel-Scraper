import type { ChapterContent, NovelDetail, NovelSummary } from "../../types/domain";

export async function getMockNovels(): Promise<NovelSummary[]> {
  const response = await fetch("/data/novels.json");
  return response.json();
}

export async function getMockNovelDetail(novelId: string): Promise<NovelDetail> {
  const response = await fetch(`/data/novels/${novelId}/meta.json`);
  return response.json();
}

export async function getMockChapter(
  novelId: string,
  chapterId: string,
): Promise<ChapterContent> {
  const response = await fetch(`/data/novels/${novelId}/chapters/${chapterId}.json`);
  return response.json();
}
