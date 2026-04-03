import { formatRelativeDate } from "../../lib/formatters";
import type { ReadingProgress } from "../../types/domain";

type ProgressSummaryProps = {
  progress?: ReadingProgress;
  className?: string;
};

export function ProgressSummary({ progress, className }: ProgressSummaryProps) {
  if (!progress) {
    return (
      <p className={className ?? "text-sm leading-6 text-ink-500"}>
        No saved progress yet.
      </p>
    );
  }

  return (
    <div className={className ?? "space-y-1 text-sm leading-6 text-ink-600"}>
      <p>Current chapter: {progress.chapterIndex}</p>
      <p>Saved scroll: {Math.round(progress.scrollTop)} px</p>
    </div>
  );
}
