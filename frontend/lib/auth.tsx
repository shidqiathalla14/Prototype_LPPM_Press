'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { Role, User } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  realRole: Role | null;
  impersonating: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<Role>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  impersonate: (target: Role) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeRole(token: string): { role: Role; real_role: Role; impersonating: boolean } {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { role: payload.role, real_role: payload.real_role, impersonating: payload.impersonating };
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [realRole, setRealRole] = useState<Role | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((u: User, effectiveRole: Role, originalRole: Role, isImpersonating: boolean) => {
    setToken('cookie-session'); setUser(u); setRole(effectiveRole); setRealRole(originalRole); setImpersonating(isImpersonating);
    document.cookie = `lppm_role=${effectiveRole}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `lppm_real_role=${originalRole}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `lppm_impersonating=${isImpersonating ? '1' : '0'}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `lppm_auth=1; path=/; max-age=86400; SameSite=Lax`;
  }, []);

  useEffect(() => {
    localStorage.removeItem('lppm_token');
    if (readCookie('lppm_auth') !== '1') { setLoading(false); return; }
    api.get<User>('/users/me')
      .then((u) => {
        const effectiveRole = (readCookie('lppm_role') || u.role) as Role;
        const originalRole = (readCookie('lppm_real_role') || u.role) as Role;
        applySession(u, effectiveRole, originalRole, readCookie('lppm_impersonating') === '1');
      })
      .catch(() => {
        document.cookie = 'lppm_auth=; path=/; max-age=0';
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [applySession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User; role: Role }>('/auth/login', { email, password });
    applySession(res.user, res.role, res.role, false);
    return res.role;
  }, [applySession]);

  const register = useCallback(async (data: Record<string, string>) => {
    await api.post('/auth/register', data);
  }, []);

  const logout = useCallback(() => {
    void api.post('/auth/logout').catch(() => undefined);
    document.cookie = 'lppm_role=; path=/; max-age=0';
    document.cookie = 'lppm_auth=; path=/; max-age=0';
    document.cookie = 'lppm_real_role=; path=/; max-age=0';
    document.cookie = 'lppm_impersonating=; path=/; max-age=0';
    setUser(null); setToken(null); setRole(null); setRealRole(null); setImpersonating(false);
    router.push('/');
  }, [router]);

  const impersonate = useCallback(async (target: Role) => {
    const res = await api.post<{ impersonation_token: string; simulated_role: Role }>('/auth/impersonate', { target_role: target });
    const u = await api.get<User>('/users/me');
    applySession(u, res.simulated_role, 'LPPM', true);
    router.push('/dashboard');
  }, [applySession, router]);

  const stopImpersonation = useCallback(async () => {
    const res = await api.post<{ access_token: string; user: User }>('/auth/stop-impersonation');
    applySession(res.user, 'LPPM', 'LPPM', false);
    router.push('/dashboard');
  }, [applySession, router]);

  const refreshUser = useCallback(async () => {
    setUser(await api.get<User>('/users/me'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, role, realRole, impersonating, loading, login, register, logout, impersonate, stopImpersonation, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}

export function homeForRole(role: Role | null): string {
  return '/dashboard';
}
