import { Link, useParams } from "react-router-dom";
import { PageSection } from "../components/shared/PageSection";
import { ProgressSummary } from "../components/shared/ProgressSummary";
import { useNovelDetailData } from "../hooks/useNovelDetailData";

export function NovelDetailPage() {
  const { novelId = "" } = useParams();
  const { detail, progress, continueChapterId, isLoading, error } =
    useNovelDetailData(novelId);

  if (isLoading) {
    return <div className="text-sm text-ink-500">Loading novel details...</div>;
  }

  if (error || !detail) {
    return <div className="text-sm text-red-700">Unable to load this novel.</div>;
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
                  className={[
                    "flex items-center justify-between gap-4 py-4 text-sm transition hover:text-ink-900",
                    progress?.chapterId === chapter.id ? "text-ink-900" : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-medium text-ink-900">{chapter.title}</p>
                    <p className="mt-1 text-ink-500">
                      {chapter.wordCount} words
                      {progress?.chapterId === chapter.id ? " · saved position" : ""}
                    </p>
                  </div>
                  <span className="text-ink-400">#{chapter.index}</span>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
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
              <div className="mt-3">
                <ProgressSummary progress={progress} />
              </div>
            </div>
          </aside>
        </div>
      </PageSection>
    </div>
  );
}
