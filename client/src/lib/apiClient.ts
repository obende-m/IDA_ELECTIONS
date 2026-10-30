const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export const NETWORK_ERROR_MESSAGE =
  'We could not reach the server. Please check your internet connection and try again. If the server was idle it can take up to a minute to wake up.';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  /** True for failures worth retrying: no response at all (status 0) or a 5xx/gateway error. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** fetch() that turns a network failure (offline, DNS, server asleep, CORS) into a friendly ApiError with status 0. */
async function safeFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }
}

/** Error payloads aren't always JSON (e.g. a proxy's 502/504 HTML page while the backend wakes up). */
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const payload = await res.json().catch(() => null);
  if (payload && typeof payload.message === 'string' && payload.message) return payload.message;
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return 'The server is starting up or temporarily unavailable. Please try again in a moment.';
  }
  return res.statusText || fallback;
}

/** Thin fetch wrapper: injects the bearer token, sends cookies for the refresh flow, and normalizes errors. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await safeFetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, 'Request failed'), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Triggers a browser download for a CSV (or other file) endpoint, e.g. voter/voting-link exports. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await safeFetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (res.status === 401) {
    onUnauthorized?.();
  }
  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, 'Download failed'), res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Multipart upload (e.g. CSV/XLSX voter import) — omits the JSON content-type so the browser sets the multipart boundary. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await safeFetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });

  if (res.status === 401) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, 'Upload failed'), res.status);
  }

  return res.json() as Promise<T>;
}
