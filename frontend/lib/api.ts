const LOCAL_API_BASE = 'http://localhost:8001/api';
const RENDER_API_BASE = 'https://madrid-urban-api.onrender.com/api';

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

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || RENDER_API_BASE);

const API_CACHE_TTL_MS = 2 * 60 * 1000;
const API_CACHE_MAX_ENTRIES = 80;

type CachedApiResponse = {
  body: string;
  status: number;
  statusText: string;
  headers: [string, string][];
  expiresAt: number;
};

const apiResponseCache = new Map<string, CachedApiResponse>();
const apiRequestsInFlight = new Map<string, Promise<CachedApiResponse>>();

export function apiUrl(path: string, base = API_BASE): string {
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const url = apiUrl(path);
  const method = (init.method || 'GET').toUpperCase();
  const cacheable = method === 'GET' && !init.signal && init.cache !== 'no-store' && init.cache !== 'reload';
  const respond = (cached: CachedApiResponse) => new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers,
  });

  if (cacheable) {
    const cached = apiResponseCache.get(url);
    if (cached && cached.expiresAt > Date.now()) return respond(cached);
    if (cached) apiResponseCache.delete(url);

    const pending = apiRequestsInFlight.get(url);
    if (pending) return respond(await pending);
  }

  const fetchWithFallback = async (targetUrl: string, isRetry = false): Promise<CachedApiResponse> => {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, { ...init, signal: init.signal || controller.signal });
      if (!response.ok) {
        if (!isRetry && targetUrl.includes('api.dmiyc.com')) {
          const fallbackUrl = apiUrl(path, RENDER_API_BASE);
          return await fetchWithFallback(fallbackUrl, true);
        }
        throw new Error(`La API respondió con HTTP ${response.status}`);
      }
      const body = await response.text();
      const result: CachedApiResponse = {
        body,
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        expiresAt: Date.now() + API_CACHE_TTL_MS,
      };

      if (cacheable && body.length <= 1_000_000 && !/no-store/i.test(response.headers.get('Cache-Control') || '')) {
        if (apiResponseCache.size >= API_CACHE_MAX_ENTRIES) {
          const oldestKey = apiResponseCache.keys().next().value;
          if (oldestKey) apiResponseCache.delete(oldestKey);
        }
        apiResponseCache.set(url, result);
      }
      return result;
    } catch (error) {
      if (!isRetry && targetUrl.includes('api.dmiyc.com')) {
        const fallbackUrl = apiUrl(path, RENDER_API_BASE);
        return await fetchWithFallback(fallbackUrl, true);
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('La API ha tardado demasiado en responder. Inténtalo de nuevo.');
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  };

  const retryDelays = [0, 1500, 3000, 6000];
  const fetchWithStartupRetries = async (): Promise<CachedApiResponse> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt] > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
      }

      try {
        return await fetchWithFallback(url);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const retryable = /tardado demasiado|Failed to fetch|NetworkError|HTTP 5\d\d/i.test(message);
        if (!retryable || attempt === retryDelays.length - 1) throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('No se pudo conectar con la API.');
  };

  if (!cacheable) return respond(await fetchWithStartupRetries());

  const pending = fetchWithStartupRetries();
  apiRequestsInFlight.set(url, pending);
  try {
    return respond(await pending);
  } finally {
    if (apiRequestsInFlight.get(url) === pending) apiRequestsInFlight.delete(url);
  }
}
