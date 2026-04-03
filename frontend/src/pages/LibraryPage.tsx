import { useRef, useState } from "react";
import { NovelCard } from "../components/library/NovelCard";
import { PageSection } from "../components/shared/PageSection";
import { createNovel, importNovelDocument, importNovelFile } from "../services/readerAppService";
import { useLibraryData } from "../hooks/useLibraryData";
import type { ImportNovelDocumentInput } from "../types/contracts";
import type { NovelSummary } from "../types/domain";

function isImportNovelDocumentInput(value: unknown): value is ImportNovelDocumentInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.title === "string" && Array.isArray(candidate.chapters);
}

async function readImportDocument(file: File): Promise<ImportNovelDocumentInput> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("This file is not valid JSON.");
  }

  if (!isImportNovelDocumentInput(parsed)) {
    throw new Error("This JSON file does not match the scraper import format.");
  }

  return parsed;
}

export function LibraryPage() {
  const [deletingNovelId, setDeletingNovelId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImportingPath, setIsImportingPath] = useState(false);
  const [isImportingUpload, setIsImportingUpload] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [selectedImportFileName, setSelectedImportFileName] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    author: "",
    description: "",
  });
  const [importFilePath, setImportFilePath] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
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
      setIsImportingPath(true);
      setAdminError(null);
      await importNovelFile(importFilePath.trim());
      setImportFilePath("");
      refresh();
    } catch (importError) {
      setAdminError(
        importError instanceof Error ? importError.message : "Unable to import this book.",
      );
    } finally {
      setIsImportingPath(false);
    }
  };

  const handleImportUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsImportingUpload(true);
      setAdminError(null);
      setSelectedImportFileName(file.name);
      const document = await readImportDocument(file);
      await importNovelDocument(document);
      refresh();
      setSelectedImportFileName(null);
      event.target.value = "";
    } catch (importError) {
      setAdminError(
        importError instanceof Error ? importError.message : "Unable to import this JSON file.",
      );
    } finally {
      setIsImportingUpload(false);
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
                Upload a local scraper JSON file privately, or import from a server path if the
                backend already has the file.
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-[18px] border border-dashed border-black/10 bg-white/70 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={isImportingUpload}
                      className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isImportingUpload ? "Uploading..." : "Choose JSON file"}
                    </button>
                    <span className="text-sm text-ink-600">
                      {selectedImportFileName ?? "No file selected"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink-600">
                    The file is read in your browser and sent directly to the backend. It is not
                    committed to GitHub.
                  </p>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportUpload}
                  />
                </div>

                <p className="text-sm font-medium text-ink-700">Or import from a backend file path</p>
                <input
                  value={importFilePath}
                  onChange={(event) => setImportFilePath(event.target.value)}
                  placeholder="data/raw/sample_novel.json"
                  className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                />
                <button
                  type="button"
                  onClick={handleImportNovel}
                  disabled={isImportingPath}
                  className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImportingPath ? "Importing..." : "Import from path"}
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
