import { useState } from "react";
import { NovelCard } from "../components/library/NovelCard";
import { PageSection } from "../components/shared/PageSection";
import { createNovel, importNovelFile } from "../services/readerAppService";
import { useLibraryData } from "../hooks/useLibraryData";
import type { NovelSummary } from "../types/domain";

export function LibraryPage() {
  const [deletingNovelId, setDeletingNovelId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    author: "",
    description: "",
  });
  const [importFilePath, setImportFilePath] = useState("");
  const { novels, removeNovel, refresh, isAdmin, isLoading, error } = useLibraryData();

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

  const handleCreateNovel = async () => {
    if (!createForm.title.trim()) {
      setAdminError("A title is required before creating a book.");
      return;
    }

    try {
      setIsCreating(true);
      setAdminError(null);
      await createNovel({
        title: createForm.title.trim(),
        author: createForm.author.trim(),
        description: createForm.description.trim(),
      });
      setCreateForm({ title: "", author: "", description: "" });
      refresh();
    } catch (createError) {
      setAdminError(
        createError instanceof Error ? createError.message : "Unable to create this book.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportNovel = async () => {
    if (!importFilePath.trim()) {
      setAdminError("Enter a JSON file path to import.");
      return;
    }

    try {
      setIsImporting(true);
      setAdminError(null);
      await importNovelFile(importFilePath.trim());
      setImportFilePath("");
      refresh();
    } catch (importError) {
      setAdminError(
        importError instanceof Error ? importError.message : "Unable to import this book.",
      );
    } finally {
      setIsImporting(false);
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
      {isAdmin ? (
        <PageSection
          eyebrow="Admin"
          title="Manage the catalogue"
          description="Create a book shell or import a structured JSON file from scraper output."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[28px] border border-black/5 bg-white/85 p-6 shadow-panel">
              <h2 className="font-display text-3xl text-ink-900">Create book</h2>
              <div className="mt-5 space-y-3">
                <input
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Title"
                  className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                />
                <input
                  value={createForm.author}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, author: event.target.value }))
                  }
                  placeholder="Author"
                  className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                />
                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Description"
                  rows={4}
                  className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                />
                <button
                  type="button"
                  onClick={handleCreateNovel}
                  disabled={isCreating}
                  className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : "Create book"}
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-black/5 bg-white/85 p-6 shadow-panel">
              <h2 className="font-display text-3xl text-ink-900">Import from file</h2>
              <p className="mt-3 text-sm leading-6 text-ink-600">
                Use a path like <code>data/raw/sample_novel.json</code>.
              </p>
              <div className="mt-5 space-y-3">
                <input
                  value={importFilePath}
                  onChange={(event) => setImportFilePath(event.target.value)}
                  placeholder="data/raw/sample_novel.json"
                  className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                />
                <button
                  type="button"
                  onClick={handleImportNovel}
                  disabled={isImporting}
                  className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? "Importing..." : "Import JSON file"}
                </button>
              </div>
            </section>
          </div>

          {adminError ? <p className="mt-4 text-sm text-red-700">{adminError}</p> : null}
        </PageSection>
      ) : null}

      <PageSection eyebrow="Library">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {novels.map((novel) => (
            <NovelCard
              key={novel.id}
              novel={novel}
              onDelete={isAdmin ? handleDeleteNovel : undefined}
              isDeleting={deletingNovelId === novel.id}
            />
          ))}
        </div>
      </PageSection>
    </div>
  );
}
