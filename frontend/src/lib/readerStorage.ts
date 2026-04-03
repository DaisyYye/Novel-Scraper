import type { ReaderSettings, ReadingProgress } from "../types/domain";
import { readStorage, removeStorage, writeStorage } from "./storage";

export const storageKeys = {
  readerSettings: "reader-settings",
  readingProgress: "reading-progress",
} as const;

export const defaultReaderSettings: ReaderSettings = {
  theme: "day",
  fontSize: 19,
  lineHeight: 1.9,
  contentWidth: 760,
  fontFamily: "literary",
  paragraphSpacing: 1.35,
};

export type ReadingProgressMap = Record<string, ReadingProgress>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

export function readReaderSettings(): ReaderSettings {
  const raw = readStorage<unknown>(storageKeys.readerSettings, defaultReaderSettings);

  if (!isObject(raw)) {
    return defaultReaderSettings;
  }

  return {
    theme:
      raw.theme === "day" || raw.theme === "night" || raw.theme === "sepia"
        ? raw.theme
        : defaultReaderSettings.theme,
    fontSize: clampNumber(raw.fontSize, defaultReaderSettings.fontSize, 15, 28),
    lineHeight: clampNumber(raw.lineHeight, defaultReaderSettings.lineHeight, 1.4, 2.3),
    contentWidth: clampNumber(raw.contentWidth, defaultReaderSettings.contentWidth, 560, 920),
    fontFamily:
      raw.fontFamily === "literary" || raw.fontFamily === "serif" || raw.fontFamily === "sans"
        ? raw.fontFamily
        : defaultReaderSettings.fontFamily,
    paragraphSpacing: clampNumber(
      raw.paragraphSpacing,
      defaultReaderSettings.paragraphSpacing,
      0.8,
      2,
    ),
  };
}

export function writeReaderSettings(settings: ReaderSettings) {
  writeStorage(storageKeys.readerSettings, settings);
}

export function readReadingProgressMap(): ReadingProgressMap {
  const raw = readStorage<unknown>(storageKeys.readingProgress, {});
  if (!isObject(raw)) {
    return {};
  }

  const normalized: ReadingProgressMap = {};

  for (const [novelId, value] of Object.entries(raw)) {
    if (!isObject(value)) {
      continue;
    }

    if (
      typeof value.novelId !== "string" ||
      typeof value.chapterId !== "string" ||
      typeof value.updatedAt !== "string"
    ) {
      continue;
    }

    normalized[novelId] = {
      novelId: value.novelId,
      chapterId: value.chapterId,
      chapterIndex: clampNumber(value.chapterIndex, 1, 1, 999999),
      scrollTop: clampNumber(value.scrollTop, 0, 0, Number.MAX_SAFE_INTEGER),
      updatedAt: value.updatedAt,
    };
  }

  return normalized;
}

export function writeReadingProgressMap(progressMap: ReadingProgressMap) {
  writeStorage(storageKeys.readingProgress, progressMap);
}

export function clearReadingProgress(novelId?: string) {
  if (!novelId) {
    removeStorage(storageKeys.readingProgress);
    return;
  }

  const progressMap = readReadingProgressMap();
  delete progressMap[novelId];
  writeReadingProgressMap(progressMap);
}
