import type { ChapterContent, NovelDetail, NovelSummary } from "../types/domain";

export async function getNovels(): Promise<NovelSummary[]> {
  const response = await fetch("/data/novels.json");
  return response.json();
}

export async function getNovelDetail(novelId: string): Promise<NovelDetail> {
  const response = await fetch(`/data/novels/${novelId}/meta.json`);
  return response.json();
}

export async function getChapter(
  novelId: string,
  chapterId: string,
): Promise<ChapterContent> {
  const response = await fetch(`/data/novels/${novelId}/chapters/${chapterId}.json`);
  return response.json();
}
