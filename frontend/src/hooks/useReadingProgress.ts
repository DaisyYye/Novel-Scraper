import { useCallback } from "react";
import type { ReadingProgress } from "../types/domain";
import { useLocalStorageState } from "./useLocalStorageState";
import type { ReadingProgressMap } from "../lib/readerStorage";
import { readReadingProgressMap, storageKeys } from "../lib/readerStorage";

export function useReadingProgress() {
  const [progressMap, setProgressMap] = useLocalStorageState<ReadingProgressMap>(
    storageKeys.readingProgress,
    readReadingProgressMap,
  );

  const saveProgress = useCallback(
    (progress: ReadingProgress) => {
      setProgressMap((current) => ({
        ...current,
        [progress.novelId]: progress,
      }));
    },
    [setProgressMap],
  );

  const getProgress = useCallback(
    (novelId: string) => progressMap[novelId],
    [progressMap],
  );

  const clearProgress = useCallback(
    (novelId: string) => {
      setProgressMap((current) => {
        const next = { ...current };
        delete next[novelId];
        return next;
      });
    },
    [setProgressMap],
  );

  return {
    progressMap,
    saveProgress,
    getProgress,
    clearProgress,
  };
}
