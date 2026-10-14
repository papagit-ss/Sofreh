"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api-client";

type State<T> = { forPath: string | null; data: T | null; error: string | null };

/** هوک ساده برای fetch با قابلیت refetch (بدون وابستگی خارجی) */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ forPath: null, data: null, error: null });
  const [reloadTick, setReloadTick] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    if (!path) return;
    const id = ++reqId.current;
    let cancelled = false;
    api<T>(path)
      .then((d) => {
        if (!cancelled && reqId.current === id) setState({ forPath: path, data: d, error: null });
      })
      .catch((e) => {
        if (!cancelled && reqId.current === id)
          setState({ forPath: path, data: null, error: e instanceof Error ? e.message : "خطا" });
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadTick]);

  const refetch = useCallback((_silent = false) => {
    void _silent;
    setReloadTick((t) => t + 1);
  }, []);

  const setData = useCallback((d: T | null) => {
    setState((s) => ({ ...s, data: d }));
  }, []);

  const isCurrent = state.forPath === path;
  return {
    data: state.data,
    error: isCurrent ? state.error : null,
    loading: !!path && !isCurrent,
    refetch,
    setData,
  };
}
