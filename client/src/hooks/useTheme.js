import { useCallback, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('mb-theme', next);
      } catch {
        /* preference just won't persist */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
