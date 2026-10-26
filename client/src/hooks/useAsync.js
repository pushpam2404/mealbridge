import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader whenever `deps` change and exposes { data, error, loading, reload, setData }.
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const latest = useRef(0);

  const run = useCallback(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return loader()
      .then((data) => id === latest.current && setState({ data, error: null, loading: false }))
      .catch((error) => id === latest.current && setState((s) => ({ ...s, error, loading: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
