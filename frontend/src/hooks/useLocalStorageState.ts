import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../lib/storage";

export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
) {
  const [state, setState] = useState<T>(() => {
    if (typeof initialValue === "function") {
      return (initialValue as () => T)();
    }

    return readStorage(key, initialValue);
  });

  useEffect(() => {
    if (typeof initialValue === "function") {
      setState(readStorage(key, (initialValue as () => T)()));
      return;
    }

    setState(readStorage(key, initialValue));
  }, [initialValue, key]);

  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);

  return [state, setState] as const;
}
