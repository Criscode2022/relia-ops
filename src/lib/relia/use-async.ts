import { useCallback, useEffect, useRef, useState } from "react";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const gen = useRef(0);

  const reload = useCallback(() => {
    const id = ++gen.current;
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((value) => {
        if (id !== gen.current) return;
        setData(value);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (id !== gen.current) return;
        setError(err instanceof Error ? err.message : "Request failed");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload, ...deps]);

  return { data, loading, error, reload, setData };
}
