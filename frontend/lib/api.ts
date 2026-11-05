const LOCAL_API_BASE = 'http://localhost:8001/api';

function normalizeApiBase(value: string): string {
  const base = value.trim().replace(/\/+$/, '');

  if (!base) return LOCAL_API_BASE;
  if (!/^https?:\/\//.test(base)) {
    throw new Error('NEXT_PUBLIC_API_URL debe incluir http:// o https://');
  }
  if (/\/api\/api(?:\/|$)/.test(base)) {
    throw new Error('NEXT_PUBLIC_API_URL no puede incluir /api dos veces');
  }

  return base.endsWith('/api') ? base : `${base}/api`;
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || LOCAL_API_BASE);

export function apiUrl(path: string): string {
  return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}

export async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl(path), { ...init, signal: init.signal || controller.signal });
    if (!response.ok) throw new Error(`La API respondió con HTTP ${response.status}`);
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La API ha tardado demasiado en responder. Inténtalo de nuevo.');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
