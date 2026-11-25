import { useCallback, useEffect, useRef, useState } from 'react';

// Results of earlier requests, keyed by `options.key`. Revisiting a page shows the last result immediately and
// refreshes it in the background (stale-while-revalidate) instead of making the user wait on the network again.
const cache = new Map();

/**
 * Loads data with loading / error state and exposes `reload` so lists refresh after mutations.
 * `deps` re-runs the request (e.g. when filters change). Out-of-order responses are ignored.
 * `options.key` (string) turns on the cache. `mutate(fn)` edits the loaded data locally (for optimistic updates).
 */
export function useFetch(fetcher, deps = [], { key } = {}) {
  const [state, setState] = useState(() => ({ data: key ? cache.get(key) ?? null : null, loading: true, error: null }));
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ data: (key && cache.get(key)) ?? s.data, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (key) cache.set(key, data);
      if (id === latest.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === latest.current) setState({ data: null, loading: false, error });
    }
  }, [key, ...deps]);

  useEffect(() => { reload(); }, [reload]);

  const mutate = useCallback((update) => {
    setState((s) => {
      if (s.data == null) return s;
      const data = update(s.data);
      if (key) cache.set(key, data);
      return { ...s, data };
    });
  }, [key]);

  return { ...state, reload, mutate };
}

/** Debounces a fast-changing value (search inputs) so we don't hit the API on every keystroke. */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
