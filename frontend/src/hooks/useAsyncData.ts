import { useEffect, useState } from "react";

type AsyncDataState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

export function useAsyncData<T>(
  load: () => Promise<T>,
  dependencies: readonly unknown[],
) {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      data: current.data,
      isLoading: true,
      error: null,
    }));

    load()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setState({
          data,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          data: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Something went wrong.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return state;
}
