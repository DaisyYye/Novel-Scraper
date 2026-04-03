import type { ReaderSettings } from "../types/domain";
import { useLocalStorageState } from "./useLocalStorageState";

const defaultSettings: ReaderSettings = {
  theme: "day",
  fontSize: 19,
  lineHeight: 1.9,
  contentWidth: 760,
  fontFamily: "literary",
  paragraphSpacing: 1.35,
};

export function useReaderSettings() {
  return useLocalStorageState<ReaderSettings>("reader-settings", defaultSettings);
}
