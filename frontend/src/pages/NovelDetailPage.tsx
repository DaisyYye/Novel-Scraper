import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageSection } from "../components/shared/PageSection";
import { getNovelDetail } from "../lib/mockApi";
import { useReadingProgress } from "../hooks/useReadingProgress";
import type { NovelDetail } from "../types/domain";

export function NovelDetailPage() {
  const { novelId = "" } = useParams();
  const [detail, setDetail] = useState<NovelDetail | null>(null);
  const { getProgress } = useReadingProgress();
  const progress = getProgress(novelId);

  useEffect(() => {
    getNovelDetail(novelId).then(setDetail);
  }, [novelId]);

  const continueChapterId = useMemo(() => {
    if (progress?.chapterId) {
      return progress.chapterId;
    }
    return detail?.chapters[0]?.id;
  }, [detail?.chapters, progress?.chapterId]);

  if (!detail) {
    return <div className="text-sm text-ink-500">Loading novel details...</div>;
  }

  return (
    <div className="space-y-10">
      <PageSection
        eyebrow={detail.novel.status}
        title={detail.novel.title}
        description={detail.novel.description}
        action={
          continueChapterId ? (
            <Link
              to={`/read/${detail.novel.id}/${continueChapterId}`}
              className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-700"
            >
              {progress ? `Continue chapter ${progress.chapterIndex}` : "Start reading"}
            </Link>
          ) : null
        }
      >
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[30px] border border-black/5 bg-white/85 p-6 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-3xl text-ink-900">Chapters</h2>
              <p className="text-sm text-ink-500">{detail.chapters.length} total</p>
            </div>
            <div className="divide-y divide-black/5">
              {detail.chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to={`/read/${detail.novel.id}/${chapter.id}`}
                  className="flex items-center justify-between gap-4 py-4 text-sm transition hover:text-ink-900"
                >
                  <div>
                    <p className="font-medium text-ink-900">{chapter.title}</p>
                    <p className="mt-1 text-ink-500">{chapter.wordCount} words</p>
                  </div>
                  <span className="text-ink-400">#{chapter.index}</span>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[30px] border border-black/5 bg-white/85 p-6 shadow-panel">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Author</p>
              <p className="mt-2 font-display text-3xl text-ink-900">{detail.novel.author}</p>
            </div>
            <div className="rounded-[30px] border border-black/5 bg-white/85 p-6 shadow-panel">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.novel.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[30px] border border-black/5 bg-white/85 p-6 shadow-panel">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Progress</p>
              <p className="mt-3 text-sm leading-7 text-ink-600">
                {progress
                  ? `You last stopped at chapter ${progress.chapterIndex}. Your scroll position is saved per novel.`
                  : "No saved progress yet. Start at chapter one when you're ready."}
              </p>
            </div>
          </aside>
        </div>
      </PageSection>
    </div>
  );
}
