import { NovelCard } from "../components/library/NovelCard";
import { PageSection } from "../components/shared/PageSection";
import { ProgressSummary } from "../components/shared/ProgressSummary";
import { useLibraryData } from "../hooks/useLibraryData";

export function LibraryPage() {
  const { novels, continueReading, progressMap, isLoading, error } = useLibraryData();

  if (isLoading) {
    return <div className="text-sm text-ink-500">Loading your library...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-700">Unable to load the library: {error}</div>;
  }

  return (
    <div className="space-y-12">
      
      <PageSection
        eyebrow="Library"
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      </PageSection>
      
      {continueReading.length > 0 ? (
        <section className="rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-panel">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-ink-500">Continue reading</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {continueReading.map((novel) => (
              <div key={novel.id} className="rounded-[24px] border border-black/5 bg-ink-50/70 p-5">
                <div className="mb-3">
                  <p className="font-display text-2xl text-ink-900">{novel.title}</p>
                  <p className="text-sm text-ink-500">{novel.author}</p>
                </div>
                <ProgressSummary progress={progressMap[novel.id]} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
