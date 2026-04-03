import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { ReaderControls } from "../components/reader/ReaderControls";
import { getChapter, getNovelDetail } from "../lib/mockApi";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useReadingProgress } from "../hooks/useReadingProgress";
import type { ChapterContent, ChapterSummary, NovelDetail } from "../types/domain";

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
  const { novelId = "", chapterId = "" } = useParams();
  const [chapter, setChapter] = useState<ChapterContent | null>(null);
  const [detail, setDetail] = useState<NovelDetail | null>(null);
  const [settings, setSettings] = useReaderSettings();
  const { getProgress, saveProgress } = useReadingProgress();
  const progress = getProgress(novelId);

  useEffect(() => {
    getNovelDetail(novelId).then(setDetail);
    getChapter(novelId, chapterId).then(setChapter);
  }, [novelId, chapterId]);

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
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        saveProgress({
          novelId,
          chapterId: chapter.id,
          chapterIndex: chapter.index,
          scrollTop: window.scrollY,
          updatedAt: new Date().toISOString(),
        });
      }, 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [chapter, novelId, saveProgress]);

  const chapterLinks = useMemo(() => detail?.chapters ?? [], [detail?.chapters]);
  const currentIndex = chapterLinks.findIndex((item) => item.id === chapterId);
  const previousChapter: ChapterSummary | undefined =
    currentIndex > 0 ? chapterLinks[currentIndex - 1] : undefined;
  const nextChapter: ChapterSummary | undefined =
    currentIndex >= 0 ? chapterLinks[currentIndex + 1] : undefined;
  const themeTokens = getThemeTokens(settings.theme);

  if (!chapter || !detail) {
    return <div className="px-6 py-10 text-sm text-ink-500">Loading chapter...</div>;
  }

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
        <section className="min-w-0">
          <header
            className={`sticky top-4 z-20 flex items-center justify-between rounded-full border px-4 py-3 backdrop-blur ${themeTokens.panel}`}
          >
            <div>
              <Link to={`/novels/${novelId}`} className="text-sm" style={{ color: themeTokens.muted }}>
                Back to novel
              </Link>
              <h1 className="font-medium" style={{ color: themeTokens.fg }}>
                {detail.novel.title}
              </h1>
            </div>
            <p className="text-sm" style={{ color: themeTokens.muted }}>
              Chapter {chapter.index}
            </p>
          </header>

          <article className="mx-auto px-3 py-12 md:px-8">
            <div className="reader-prose mx-auto">
              <header className="mb-10 space-y-3">
                <p className="text-sm uppercase tracking-[0.2em]" style={{ color: themeTokens.muted }}>
                  {detail.novel.author}
                </p>
                <h2 className="font-display text-5xl leading-tight">{chapter.title}</h2>
              </header>

              <div>
                {chapter.content.split("\n\n").map((paragraph, index) => (
                  <p key={`${chapter.id}-${index}`}>{paragraph}</p>
                ))}
              </div>

              <footer className="mt-14 flex items-center justify-between gap-4 border-t border-current/10 pt-8 text-sm">
                {previousChapter ? (
                  <Link to={`/read/${novelId}/${previousChapter.id}`}>Previous chapter</Link>
                ) : (
                  <span style={{ color: themeTokens.muted }}>Beginning of novel</span>
                )}

                {nextChapter ? (
                  <Link to={`/read/${novelId}/${nextChapter.id}`}>Next chapter</Link>
                ) : (
                  <span style={{ color: themeTokens.muted }}>Latest available chapter</span>
                )}
              </footer>
            </div>
          </article>
        </section>

        <div className="lg:sticky lg:top-4 lg:h-fit">
          <ReaderControls settings={settings} setSettings={setSettings} />
        </div>
      </div>
    </div>
  );
}
