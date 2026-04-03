import type { ReaderSettings } from "../types/domain";
import { useLocalStorageState } from "./useLocalStorageState";
import { readReaderSettings, storageKeys } from "../lib/readerStorage";

export function useReaderSettings() {
  return useLocalStorageState<ReaderSettings>(storageKeys.readerSettings, readReaderSettings);
}
