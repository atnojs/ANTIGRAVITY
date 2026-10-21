/**
 * Cliente HTTP de la agenda.
 *
 * La app se sirve en /apps/agenda/ y el backend PHP vive en la misma carpeta:
 *   - API REST:   api/...        (reescrito a api.php por .htaccess)
 *   - sesión:     auth.php
 *   - audios:     uploads/audio/... (reescrito a audio.php, con sesión)
 *
 * Todas las rutas se resuelven con document.baseURI para que funcione igual
 * en producción (/apps/agenda/) que en local (http://127.0.0.1:8091/).
 */

const API_BASE = new URL('api/', document.baseURI).toString();
const AUTH_BASE = new URL('auth.php', document.baseURI).toString();
const AUDIO_BASE = new URL('uploads/audio/', document.baseURI).toString();

let csrfToken: string | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

/** URL pública y autenticada de un audio guardado en el servidor. */
export function audioUrl(file?: string | null): string {
  if (!file) return '';
  return AUDIO_BASE + encodeURIComponent(file);
}

/**
 * Llama a la API REST. Añade el token CSRF en las escrituras y avisa a la
 * pantalla de login cuando la sesión ha caducado.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = API_BASE + path.replace(/^\/+/, '');
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers ?? {});

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('agenda:unauthorized'));
    throw new ApiError('La sesión ha caducado. Vuelve a entrar.', 401);
  }

  return response;
}

/** Lee el error JSON del servidor y lanza un ApiError legible. */
export async function readApiError(response: Response): Promise<ApiError> {
  let message = `Error del servidor (${response.status})`;
  try {
    const data = await response.json();
    if (data && typeof data.error === 'string' && data.error.trim() !== '') {
      message = data.error;
    }
  } catch {
    /* respuesta sin JSON */
  }
  return new ApiError(message, response.status);
}

export interface AuthStatus {
  auth: boolean;
  csrf: string | null;
}

export async function authStatus(): Promise<AuthStatus> {
  const response = await fetch(`${AUTH_BASE}?t=${Date.now()}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new ApiError('No se pudo comprobar la sesión.', response.status);
  }
  const data = (await response.json()) as Partial<AuthStatus>;
  const status: AuthStatus = {
    auth: Boolean(data.auth),
    csrf: typeof data.csrf === 'string' ? data.csrf : null,
  };
  setCsrfToken(status.auth ? status.csrf : null);
  return status;
}

export async function login(password: string): Promise<AuthStatus> {
  const response = await fetch(AUTH_BASE, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', password }),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<AuthStatus> & { error?: string };
  if (!response.ok) {
    throw new ApiError(typeof data.error === 'string' ? data.error : 'No se pudo iniciar sesión.', response.status);
  }
  const status: AuthStatus = {
    auth: Boolean(data.auth),
    csrf: typeof data.csrf === 'string' ? data.csrf : null,
  };
  setCsrfToken(status.csrf);
  return status;
}

export async function logout(): Promise<void> {
  try {
    await fetch(AUTH_BASE, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
  } finally {
    setCsrfToken(null);
  }
}
