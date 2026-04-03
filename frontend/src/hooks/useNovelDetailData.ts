import { useEffect, useMemo } from "react";
import { getNovelById, getReadingProgress } from "../services/readerAppService";
import { useAsyncData } from "./useAsyncData";
import { useReadingProgress } from "./useReadingProgress";

export function useNovelDetailData(novelId: string) {
  const { getProgress, saveProgress } = useReadingProgress();
  const detailState = useAsyncData(async () => {
    const [detail, progress] = await Promise.all([
      getNovelById(novelId),
      getReadingProgress(novelId),
    ]);

    return {
      detail,
      progress,
    };
  }, [novelId]);

  const progress = detailState.data?.progress ?? getProgress(novelId);

  useEffect(() => {
    if (detailState.data?.progress) {
      saveProgress(detailState.data.progress);
    }
  }, [detailState.data?.progress, saveProgress]);

  const continueChapterId = useMemo(() => {
    if (progress?.chapterId) {
      return progress.chapterId;
    }

    return detailState.data?.detail.chapters[0]?.id;
  }, [detailState.data?.detail.chapters, progress?.chapterId]);

  return {
    detail: detailState.data?.detail ?? null,
    progress,
    continueChapterId,
    isLoading: detailState.isLoading,
    error: detailState.error,
  };
}
