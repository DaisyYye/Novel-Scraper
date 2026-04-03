import { useState } from "react";
import { NovelCard } from "../components/library/NovelCard";
import { PageSection } from "../components/shared/PageSection";
import { useLibraryData } from "../hooks/useLibraryData";
import type { NovelSummary } from "../types/domain";

export function LibraryPage() {
  const [deletingNovelId, setDeletingNovelId] = useState<string | null>(null);
  const { novels, removeNovel, isLoading, error } = useLibraryData();

  const handleDeleteNovel = async (novel: NovelSummary) => {
    const confirmed = window.confirm(`Delete "${novel.title}" from your library?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingNovelId(novel.id);
      await removeNovel(novel.id);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete this book.";
      window.alert(message);
    } finally {
      setDeletingNovelId(null);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-ink-500">Loading your library...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-700">Unable to load the library: {error}</div>;
  }

  return (
    <div className="space-y-12">
      <PageSection eyebrow="Library">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <NovelCard
              key={novel.id}
              novel={novel}
              onDelete={handleDeleteNovel}
              isDeleting={deletingNovelId === novel.id}
            />
          ))}
        </div>
      </PageSection>
    </div>
  );
}
