import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { ReaderControls } from "../components/reader/ReaderControls";
import { formatRelativeDate } from "../lib/formatters";
import { useReaderData } from "../hooks/useReaderData";

function getThemeTokens(theme: "day" | "night" | "sepia") {
  if (theme === "night") {
    return {
      bg: "#171412",
      fg: "#f0e8d8",
      muted: "#b7ab98",
      panel: "bg-[#221d19]/90 border-white/10",
    };
  }

  if (theme === "sepia") {
    return {
      bg: "#f5ede0",
      fg: "#43382d",
      muted: "#7e6e5d",
      panel: "bg-white/60 border-black/10",
    };
  }

  return {
    bg: "#f8f5ef",
    fg: "#221d19",
    muted: "#6f6250",
    panel: "bg-white/72 border-black/10",
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
  const { novelId = "", chapterId = "" } = useParams();
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
          "--reader-content-width": `${settings.contentWidth}px`,
          "--reader-font-size": `${settings.fontSize}px`,
          "--reader-line-height": String(settings.lineHeight),
          "--reader-font-family": getFontFamily(settings.fontFamily),
          "--reader-paragraph-spacing": `${settings.paragraphSpacing}rem`,
        } as CSSProperties
      }
    >
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[1fr_320px] lg:px-6">
        <section className="order-2 min-w-0 lg:order-1">
          <header
            className={`reader-header top-2 z-20 flex items-center justify-between gap-3 rounded-[24px] border px-4 py-3 ${themeTokens.panel}`}
          >
            <div className="min-w-0">
              <Link to={`/novels/${novelId}`} className="text-sm" style={{ color: themeTokens.muted }}>
                Back to novel
              </Link>
              <h1 className="truncate font-medium" style={{ color: themeTokens.fg }}>
                {detail.novel.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="shrink-0 text-sm" style={{ color: themeTokens.muted }}>
                Chapter {chapter.index}
              </p>
              <button
                type="button"
                onClick={() => setShowMobileControls(true)}
                className="rounded-full border px-3 py-2 text-sm lg:hidden"
                style={{
                  color: themeTokens.fg,
                  borderColor: "rgba(128,128,128,0.2)",
                }}
              >
                Display
              </button>
            </div>
          </header>

          <article className="mx-auto px-1 py-8 sm:px-3 md:px-8 md:py-12">
            <div className="reader-prose mx-auto">
              <header className="mb-10 space-y-3">
                <p className="text-sm uppercase tracking-[0.2em]" style={{ color: themeTokens.muted }}>
                  {detail.novel.author}
                </p>
                <h2 className="font-display text-4xl leading-tight sm:text-5xl">{chapter.title}</h2>
                {progress?.chapterId === chapter.id ? (
                  <p className="text-sm" style={{ color: themeTokens.muted }}>
                    Restored from {Math.round(progress.scrollTop)} px, last read{" "}
                    {formatRelativeDate(progress.updatedAt)}
                  </p>
                ) : null}
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

        <div className="order-1 hidden lg:sticky lg:top-4 lg:block lg:h-fit">
          <ReaderControls settings={settings} setSettings={setSettings} />
        </div>
      </div>

      {showMobileControls ? (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setShowMobileControls(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[32px] border border-black/10 bg-[#1f1b17] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Reader settings</p>
                <h2 className="mt-1 font-display text-3xl text-ink-50">Adjust your page</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileControls(false)}
                className="rounded-full border border-white/10 px-3 py-2 text-sm text-ink-100"
              >
                Close
              </button>
            </div>
            <ReaderControls
              settings={settings}
              setSettings={setSettings}
              className="max-w-none border-white/10 bg-white/5 p-0 md:max-w-none"
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
