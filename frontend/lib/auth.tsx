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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [realRole, setRealRole] = useState<Role | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((t: string, u: User) => {
    const meta = decodeRole(t);
    setToken(t); setUser(u); setRole(meta.role); setRealRole(meta.real_role); setImpersonating(meta.impersonating);
    localStorage.setItem('lppm_token', t);
    document.cookie = `lppm_role=${meta.role}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `lppm_auth=1; path=/; max-age=86400; SameSite=Lax`;
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('lppm_token');
    if (!t) { setLoading(false); return; }
    api.get<User>('/users/me', t)
      .then((u) => applyToken(t, u))
      .catch(() => localStorage.removeItem('lppm_token'))
      .finally(() => setLoading(false));
  }, [applyToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User; role: Role }>('/auth/login', { email, password });
    applyToken(res.access_token, res.user);
    return res.role;
  }, [applyToken]);

  const register = useCallback(async (data: Record<string, string>) => {
    await api.post('/auth/register', data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lppm_token');
    document.cookie = 'lppm_role=; path=/; max-age=0';
    document.cookie = 'lppm_auth=; path=/; max-age=0';
    setUser(null); setToken(null); setRole(null); setRealRole(null); setImpersonating(false);
    router.push('/');
  }, [router]);

  const impersonate = useCallback(async (target: Role) => {
    if (!token) return;
    const res = await api.post<{ impersonation_token: string }>('/auth/impersonate', { target_role: target }, token);
    const u = await api.get<User>('/users/me', res.impersonation_token);
    applyToken(res.impersonation_token, u);
    router.push('/dashboard');
  }, [token, applyToken, router]);

  const stopImpersonation = useCallback(async () => {
    if (!token) return;
    const res = await api.post<{ access_token: string; user: User }>('/auth/stop-impersonation', {}, token);
    applyToken(res.access_token, res.user);
    router.push('/dashboard');
  }, [token, applyToken, router]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    setUser(await api.get<User>('/users/me', token));
  }, [token]);

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
