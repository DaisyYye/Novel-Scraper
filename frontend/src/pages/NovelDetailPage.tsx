import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageSection } from "../components/shared/PageSection";
import { ProgressSummary } from "../components/shared/ProgressSummary";
import { useNovelDetailData } from "../hooks/useNovelDetailData";
import { updateNovel } from "../services/readerAppService";

type EditFormState = {
  title: string;
  author: string;
  description: string;
};

export function NovelDetailPage() {
  const { novelId = "" } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>({
    title: "",
    author: "",
    description: "",
  });
  const { detail, progress, continueChapterId, isLoading, error } =
    useNovelDetailData(novelId, refreshKey);

  useEffect(() => {
    if (!detail) {
      return;
    }

    setForm({
      title: detail.novel.title,
      author: detail.novel.author,
      description: detail.novel.description,
    });
  }, [detail]);

  const handleCancel = () => {
    if (!detail) {
      return;
    }

    setForm({
      title: detail.novel.title,
      author: detail.novel.author,
      description: detail.novel.description,
    });
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setSaveError("Title is required.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      await updateNovel(novelId, {
        title: trimmedTitle,
        author: form.author.trim(),
        description: form.description.trim(),
      });
      setIsEditing(false);
      setRefreshKey((current) => current + 1);
    } catch (saveNovelError) {
      setSaveError(
        saveNovelError instanceof Error ? saveNovelError.message : "Unable to save this novel.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-ink-500">Loading novel details...</div>;
  }

  if (error || !detail) {
    return <div className="text-sm text-red-700">Unable to load this novel.</div>;
  }

  return (
    <div className="space-y-10">
      <PageSection
        title={isEditing ? form.title || "Edit novel" : detail.novel.title}
        description={isEditing ? form.author : detail.novel.author}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {continueChapterId ? (
              <Link
                to={`/read/${detail.novel.id}/${continueChapterId}`}
                className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-700"
              >
                {progress ? `Continue chapter ${progress.chapterIndex}` : "Start reading"}
              </Link>
            ) : null}
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setIsEditing(true);
                }}
                className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
              >
                Edit details
              </button>
            )}
          </div>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[30px] border border-black/5 bg-white/85 p-6 shadow-panel">
            {isEditing ? (
              <div className="mb-8 space-y-5 rounded-[24px] border border-black/5 bg-ink-50/70 p-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-700" htmlFor="novel-title">
                    Title
                  </label>
                  <input
                    id="novel-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-700" htmlFor="novel-author">
                    Author
                  </label>
                  <input
                    id="novel-author"
                    value={form.author}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, author: event.target.value }))
                    }
                    className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-700" htmlFor="novel-description">
                    Description
                  </label>
                  <textarea
                    id="novel-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={5}
                    className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-ink-900 outline-none transition focus:border-ink-400"
                  />
                </div>

                {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
              </div>
            ) : null}

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
