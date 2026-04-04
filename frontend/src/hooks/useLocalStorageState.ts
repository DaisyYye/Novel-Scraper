import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../lib/storage";

export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
) {
  const resolveInitialValue = () => {
    if (typeof initialValue === "function") {
      return (initialValue as () => T)();
    }

    return initialValue;
  };

  const [state, setState] = useState<T>(() => {
    return readStorage(key, resolveInitialValue());
  });

  useEffect(() => {
    setState(readStorage(key, resolveInitialValue()));
  }, [key]);

  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);

  return [state, setState] as const;
}
