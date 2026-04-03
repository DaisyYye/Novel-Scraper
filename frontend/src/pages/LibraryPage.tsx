import { useEffect, useState } from "react";
import { NovelCard } from "../components/library/NovelCard";
import { PageSection } from "../components/shared/PageSection";
import { getNovels } from "../lib/mockApi";
import { useReadingProgress } from "../hooks/useReadingProgress";
import type { NovelSummary } from "../types/domain";

export function LibraryPage() {
  const [novels, setNovels] = useState<NovelSummary[]>([]);
  const { progressMap } = useReadingProgress();

  useEffect(() => {
    getNovels().then(setNovels);
  }, []);

  return (
    <div className="space-y-12">
      <PageSection
        eyebrow="Library"
        title="A calm place to read for hours"
        description="Structured JSON drives the app, while your scraper can keep exporting text separately. This starter library uses lightweight mock content and remembers your reading progress."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} progress={progressMap[novel.id]} />
          ))}
        </div>
      </PageSection>
    </div>
  );
}
