import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, sessionHint } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !sessionHint.get());

  useEffect(() => {
    if (!sessionHint.get()) return;
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => sessionHint.set(false))
      .finally(() => setReady(true));
  }, []);

  const startSession = useCallback(({ user }) => {
    sessionHint.set(true);
    setUser(user);
    return user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login: async (credentials) => startSession(await api.login(credentials)),
      register: async (details) => startSession(await api.register(details)),
      logout: () => {
        sessionHint.set(false);
        api.logout().catch(() => {});
        setUser(null);
      },
      setUser,
    }),
    [user, ready, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
