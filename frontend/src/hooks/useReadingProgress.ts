import { useCallback } from "react";
import type { ReadingProgress } from "../types/domain";
import { useLocalStorageState } from "./useLocalStorageState";

type ProgressMap = Record<string, ReadingProgress>;

export function useReadingProgress() {
  const [progressMap, setProgressMap] = useLocalStorageState<ProgressMap>(
    "reading-progress",
    {},
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

  return {
    progressMap,
    saveProgress,
    getProgress,
  };
}
