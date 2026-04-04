import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ReaderControls } from "../components/reader/ReaderControls";
import { useReaderData } from "../hooks/useReaderData";
import { defaultReaderSettings } from "../lib/readerStorage";

function getThemeTokens(theme: "day" | "night" | "sepia") {
  if (theme === "night") {
    return {
      bg: "#171412",
      fg: "#f0e8d8",
      muted: "#b7ab98",
      panel: "bg-[#221d19]/90 border-white/10",
      topBar: "border-white/10 bg-[#1f1a16]/92 text-[#f0e8d8]",
      titleAccent: "#d8c8a8",
    };
  }

  if (theme === "sepia") {
    return {
      bg: "#f5ede0",
      fg: "#43382d",
      muted: "#7e6e5d",
      panel: "bg-white/60 border-black/10",
      topBar: "border-[#decfb8] bg-[#f4ead8]/95 text-[#43382d]",
      titleAccent: "#b79c6c",
    };
  }

  return {
    bg: "#f7f7f7",
    fg: "#221d19",
    muted: "#6f6250",
    panel: "bg-white/72 border-black/10",
    topBar: "border-[#ddd4c5] bg-[#f4efe4]/96 text-[#221d19]",
    titleAccent: "#b79c6c",
  };
}

function getFontFamily(fontFamily: "literary" | "serif" | "sans") {
  if (fontFamily === "sans") return "Inter, system-ui, sans-serif";
  if (fontFamily === "serif") return "Lora, Georgia, serif";
  return "\"Cormorant Garamond\", Georgia, serif";
}

export function ReaderPage() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const restoredChapterIdRef = useRef<string | null>(null);
  const { novelId = "", chapterId = "" } = useParams();
  const navigate = useNavigate();
  const {
    detail,
    chapter,
    settings,
    setSettings,
    progress,
    persistProgress,
    previousChapter,
    nextChapter,
    isLoading,
    error,
  } = useReaderData(novelId, chapterId);

  const persistCurrentProgress = useCallback(() => {
    if (!chapter) {
      return;
    }

    void persistProgress(chapter, window.scrollY);
  }, [chapter, persistProgress]);

  useEffect(() => {
    if (!chapter) {
      return;
    }

    if (restoredChapterIdRef.current === chapter.id) {
      return;
    }

    restoredChapterIdRef.current = chapter.id;
    const initialScroll = progress?.chapterId === chapter.id ? progress.scrollTop : 0;
    window.requestAnimationFrame(() => window.scrollTo({ top: initialScroll, behavior: "auto" }));
  }, [chapter, progress?.chapterId, progress?.scrollTop]);

  useEffect(() => {
    if (!chapter) {
      return;
    }

    let timeoutId: number | null = null;

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        persistCurrentProgress();
      }, 120);
    };

    const handlePageHide = () => {
      persistCurrentProgress();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistCurrentProgress();
      }
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      persistCurrentProgress();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [chapter, persistCurrentProgress]);

  useEffect(() => {
    setShowMobileControls(false);
  }, [chapterId]);

  if (isLoading) {
    return <div className="px-6 py-10 text-sm text-ink-500">Loading chapter...</div>;
  }

  if (error || !chapter || !detail || !settings) {
    return <div className="px-6 py-10 text-sm text-red-700">Unable to load this chapter.</div>;
  }

  const themeTokens = getThemeTokens(settings.theme);

  return (
    <div
      className="reader-surface min-h-screen transition-colors duration-300"
      style={
        {
          "--reader-bg": themeTokens.bg,
          "--reader-fg": themeTokens.fg,
          "--reader-content-width": `${defaultReaderSettings.contentWidth}px`,
          "--reader-font-size": `${settings.fontSize}px`,
          "--reader-line-height": String(settings.lineHeight),
          "--reader-font-family": getFontFamily(defaultReaderSettings.fontFamily),
          "--reader-paragraph-spacing": `${settings.paragraphSpacing}rem`,
        } as CSSProperties
      }
    >
      <div className="mx-auto min-h-screen max-w-7xl px-3 py-3 sm:px-4 lg:px-6">
        <section className="min-w-0">
          <div className="top-2 z-30 space-y-3">
            <header
              className={`reader-header rounded-[28px] border px-4 py-3 shadow-[0_14px_28px_rgba(77,60,33,0.08)] backdrop-blur ${themeTokens.topBar}`}
            >
              <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,auto)_minmax(0,1fr)]">
                <div className="flex items-center justify-start">
                  <Link
                    to={`/novels/${novelId}`}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition hover:bg-black/5"
                    style={{ color: themeTokens.fg }}
                  >
                    <span aria-hidden="true">&larr;</span>
                    <span className="truncate">Back to novel</span>
                  </Link>
                </div>

                <div className="min-w-0 text-center">
                  <h1 className="truncate font-display text-xl leading-tight sm:text-2xl" style={{ color: themeTokens.fg }}>
                    {detail.novel.title}
                  </h1>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <label className="min-w-0">
                    <span className="sr-only">Select chapter</span>
                    <select
                      value={chapter.id}
                      onChange={(event) => navigate(`/read/${novelId}/${event.target.value}`)}
                      className="w-full min-w-[160px] rounded-2xl border border-current/10 bg-white/60 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
                      style={{
                        color: themeTokens.fg,
                        backgroundColor: settings.theme === "night" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {detail.chapters.map((item) => (
                        <option key={item.id} value={item.id}>
                          Chapter {item.index}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMobileControls(true)}
                    className="rounded-full border px-3 py-2 text-sm lg:hidden"
                    style={{
                      color: themeTokens.fg,
                      borderColor: "rgba(128,128,128,0.2)",
                    }}
                  >
                    Settings
                  </button>
                </div>
              </div>
            </header>

            <div className="hidden lg:block">
              <ReaderControls
                settings={settings}
                setSettings={setSettings}
                layout="toolbar"
              />
            </div>
          </div>

          <article className="mx-auto px-1 py-8 sm:px-3 md:px-8 md:py-12">
            <div className="reader-prose mx-auto">
              <header className="mb-10 space-y-3">
                <p className="text-sm uppercase tracking-[0.2em]" style={{ color: themeTokens.muted }}>
                  {detail.novel.author}
                </p>
                <h2 className="font-display text-4xl leading-tight sm:text-5xl">{chapter.title}</h2>
              </header>

              <div>
                {chapter.content.split("\n\n").map((paragraph, index) => (
                  <p key={`${chapter.id}-${index}`}>{paragraph}</p>
                ))}
              </div>

              <footer className="mt-14 flex flex-col gap-3 border-t border-current/10 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                {previousChapter ? (
                  <Link className="reader-mobile-link" to={`/read/${novelId}/${previousChapter.id}`}>
                    Previous chapter
                  </Link>
                ) : (
                  <span style={{ color: themeTokens.muted }}>Beginning of novel</span>
                )}

                {nextChapter ? (
                  <Link className="reader-mobile-link" to={`/read/${novelId}/${nextChapter.id}`}>
                    Next chapter
                  </Link>
                ) : (
                  <span style={{ color: themeTokens.muted }}>Latest available chapter</span>
                )}
              </footer>
            </div>
          </article>
        </section>
      </div>

      {showMobileControls ? (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setShowMobileControls(false)}>
          <div
            className="absolute inset-x-4 bottom-4 max-h-[68vh] overflow-y-auto rounded-[28px] border border-[#decfb8] bg-[#f4ead8] p-3.5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8d7450]">Reader settings</p>
                <h2 className="mt-1 font-display text-2xl text-[#43382d]">Adjust your page</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileControls(false)}
                className="rounded-full border border-[#d9c5a2] px-3 py-2 text-sm text-[#43382d]"
              >
                Close
              </button>
            </div>
            <ReaderControls
              settings={settings}
              setSettings={setSettings}
              className="max-w-none border-0 bg-transparent p-0 shadow-none md:max-w-none"
            />
          </div>
        </div>
      ) : null}

      {showBackToTop ? (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-4 right-4 z-50 rounded-full border px-4 py-3 text-sm shadow-lg backdrop-blur transition hover:scale-105"
          style={{
            backgroundColor: themeTokens.bg,
            color: themeTokens.fg,
            borderColor: "rgba(128,128,128,0.2)",
          }}
          aria-label="Back to top"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}
