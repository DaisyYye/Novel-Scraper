import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import type { NovelSummary } from "../../types/domain";

type NovelCardProps = {
  novel: NovelSummary;
  onDelete?: (novel: NovelSummary) => void;
  isDeleting?: boolean;
};

export function NovelCard({ novel, onDelete, isDeleting = false }: NovelCardProps) {
  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete?.(novel);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-black/5 bg-white/85 p-5 shadow-panel transition hover:-translate-y-1 hover:border-black/10">
      <Link to={`/novels/${novel.id}`} className="group flex h-full flex-col">
        <div
          className="mb-5 h-44 rounded-[22px]"
          style={{
            background: `linear-gradient(135deg, ${novel.coverColor}, rgba(255,255,255,0.65))`,
          }}
        />
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="font-display text-3xl leading-tight text-ink-900">{novel.title}</h2>
            <p className="text-sm text-ink-500">{novel.author}</p>
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-ink-600">{novel.description}</p>
        </div>
      </Link>

      {onDelete ? (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
