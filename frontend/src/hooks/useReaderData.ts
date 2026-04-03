import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetStateAction } from "react";
import {
  getChapter,
  getNovelById,
  getReadingProgress,
  getReaderSettings,
  saveReaderSettings,
  saveReadingProgress,
} from "../services/readerAppService";
import type {
  ChapterContent,
  ChapterSummary,
  NovelDetail,
  ReaderSettings,
} from "../types/domain";
import { useAsyncData } from "./useAsyncData";
import { useReadingProgress } from "./useReadingProgress";

export function useReaderData(novelId: string, chapterId: string) {
  const detailState = useAsyncData(() => getNovelById(novelId), [novelId]);
  const chapterState = useAsyncData(() => getChapter(novelId, chapterId), [novelId, chapterId]);
  const [settings, setSettingsState] = useState<ReaderSettings | null>(null);
  const [serverProgressLoaded, setServerProgressLoaded] = useState(false);
  const { getProgress, saveProgress } = useReadingProgress();
  const progress = getProgress(novelId);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getReaderSettings(), getReadingProgress(novelId)]).then(
      ([readerSettings, readingProgress]) => {
        if (cancelled) {
          return;
        }

        setSettingsState(readerSettings);
        if (readingProgress) {
          saveProgress(readingProgress);
        }
        setServerProgressLoaded(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [novelId, saveProgress]);

  const setSettings = useCallback(
    async (updater: SetStateAction<ReaderSettings>) => {
      setSettingsState((current) => {
        const previous = current;
        if (!previous) {
          return previous;
        }

        const next =
          typeof updater === "function"
            ? (updater as (value: ReaderSettings) => ReaderSettings)(previous)
            : updater;

        void saveReaderSettings(next);
        return next;
      });
    },
    [],
  );

  const persistProgress = useCallback(
    async (chapter: ChapterContent, scrollTop: number) => {
      const nextProgress = {
        novelId,
        chapterId: chapter.id,
        chapterIndex: chapter.index,
        scrollTop,
        updatedAt: new Date().toISOString(),
      };

      saveProgress(nextProgress);
      await saveReadingProgress(novelId, nextProgress);
      return nextProgress;
    },
    [novelId, saveProgress],
  );

  const chapterLinks = useMemo(() => detailState.data?.chapters ?? [], [detailState.data?.chapters]);
  const currentIndex = chapterLinks.findIndex((item) => item.id === chapterId);
  const previousChapter: ChapterSummary | undefined =
    currentIndex > 0 ? chapterLinks[currentIndex - 1] : undefined;
  const nextChapter: ChapterSummary | undefined =
    currentIndex >= 0 ? chapterLinks[currentIndex + 1] : undefined;

  return {
    detail: detailState.data as NovelDetail | null,
    chapter: chapterState.data as ChapterContent | null,
    settings,
    setSettings,
    progress,
    persistProgress,
    previousChapter,
    nextChapter,
    isLoading:
      detailState.isLoading || chapterState.isLoading || settings === null || !serverProgressLoaded,
    error: detailState.error ?? chapterState.error,
  };
}
