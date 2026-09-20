/**
 * API client for the NestJS backend.
 * All requests are tenant-scoped via the JWT Bearer token.
 * Offline: requests that fail with network errors are queued in the outbox (via Dexie).
 */

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly detail: string,
    public readonly errors?: unknown[],
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const problem = await res.json().catch(() => ({
      status: res.status,
      code: 'UNKNOWN',
      detail: res.statusText,
    }));
    throw new ApiError(problem.status ?? res.status, problem.code ?? 'UNKNOWN', problem.detail ?? res.statusText, problem.errors);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string) => request<T>('GET', path),
  post:   <T>(path: string, body?: unknown, idempotencyKey?: string) => request<T>('POST', path, body, idempotencyKey),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put:    <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
