export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/** API calls. */
export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || res.statusText);
  }
  return res.json();
}

/** Public calls used by server components. */
export async function publicGet<T = any>(path: string): Promise<T> {
  const res = await fetch(API + path, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(API + '/uploads', { method: 'POST', body: fd });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Upload failed');
  return (await res.json()).url;
}
