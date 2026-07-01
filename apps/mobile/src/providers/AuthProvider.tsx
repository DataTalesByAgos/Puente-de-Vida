import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import * as auth from '@/lib/auth';

export type UserRole = 'citizen' | 'volunteer' | 'coordinator' | 'organization' | 'admin';

export interface AuthState {
  token: string | null;
  role: UserRole | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (user: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    username: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await auth.getToken();
        const role = await auth.getRole();
        const username = await auth.getUsername();
        if (token && role) {
          setState({
            token,
            role: role as UserRole,
            username,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const login = useCallback(async (user: string, pass: string) => {
    const res = await api.login(user, pass);
    await auth.setSession(res.token, res.role, res.username);
    setState({
      token: res.token,
      role: res.role as UserRole,
      username: res.username,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    await auth.clearSession();
    setState({ token: null, role: null, username: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
