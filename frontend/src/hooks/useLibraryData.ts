import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppAuth } from "../auth/AuthContext";
import { deleteNovel, getNovels, getReadingProgress } from "../services/readerAppService";
import { useAsyncData } from "./useAsyncData";
import { useReadingProgress } from "./useReadingProgress";
import type { ReadingProgress } from "../types/domain";

export function useLibraryData() {
  const { isAdmin } = useAppAuth();
  const { progressMap: cachedProgressMap, saveProgress, clearProgress } = useReadingProgress();
  const [reloadKey, setReloadKey] = useState(0);
  const libraryState = useAsyncData(async () => {
    const novels = await getNovels();
    const entries = await Promise.all(
      novels.map(async (novel) => {
        const progress = await getReadingProgress(novel.id);
        return [novel.id, progress] as const;
      }),
    );

    const progressMap = Object.fromEntries(
      entries.filter((entry): entry is readonly [string, ReadingProgress] => Boolean(entry[1])),
    );

    return {
      novels,
      progressMap,
    };
  }, [reloadKey]);

  const novels = libraryState.data?.novels ?? [];
  const progressMap = libraryState.data?.progressMap ?? cachedProgressMap;

  useEffect(() => {
    Object.values(progressMap).forEach((progress) => {
      saveProgress(progress);
    });
  }, [progressMap, saveProgress]);

  const continueReading = useMemo(
    () => novels.filter((novel) => Boolean(progressMap[novel.id])),
    [novels, progressMap],
  );

  const removeNovel = useCallback(
    async (novelId: string) => {
      await deleteNovel(novelId);
      clearProgress(novelId);
      setReloadKey((current) => current + 1);
    },
    [clearProgress],
  );

  return {
    novels,
    continueReading,
    progressMap,
    removeNovel,
    refresh: () => setReloadKey((current) => current + 1),
    isAdmin,
    isLoading: libraryState.isLoading,
    error: libraryState.error,
  };
}
