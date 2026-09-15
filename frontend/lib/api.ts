const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, opts: { token?: string | null; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token && opts.token !== 'cookie-session') headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${API_URL}${path}`, { method, headers, body, cache: 'no-store', credentials: 'include' });
  if (!res.ok) {
    let message = 'Terjadi kesalahan pada server';
    try {
      const data = await res.json();
      if (typeof data?.message === 'string') message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.join(', ');
    } catch { /* abaikan */ }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>('GET', path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) => request<T>('POST', path, { body, token }),
  postForm: <T>(path: string, form: FormData, token?: string | null) => request<T>('POST', path, { form, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) => request<T>('PATCH', path, { body, token }),
  patchForm: <T>(path: string, form: FormData, token?: string | null) => request<T>('PATCH', path, { form, token }),
};

export function downloadUrl(path: string) {
  return `${API_URL}${path}`;
}

/** Unduh berkas terproteksi dengan header Authorization lalu picu download. */
export async function downloadFile(path: string, token: string, fallbackName: string) {
  const headers: Record<string, string> = {};
  if (token && token !== 'cookie-session') headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Gagal mengunduh berkas');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatRupiah(n: number): string {
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
