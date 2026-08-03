// This API is protected by a login. Every admin request needs to send the
// session cookie Flask sets at login, which requires credentials: 'include'.
//
// API_BASE resolution, in order:
//   1. REACT_APP_API_BASE, if set (this is how production deployments,
//      e.g. Render, point the frontend at the deployed backend URL --
//      frontend and backend live on totally different domains there, so
//      there's no "same hostname" trick to fall back on).
//   2. Local development fallback: match whatever hostname the browser
//      is actually using (localhost vs 127.0.0.1) so the session cookie
//      is never silently blocked by a hostname mismatch.
const BACKEND_PORT = 5000;
export const API_BASE =
  process.env.REACT_APP_API_BASE || `http://${window.location.hostname}:${BACKEND_PORT}`;

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired. Redirecting to login…');
  }

  return response;
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export async function login(password) {
  const res = await apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function logout() {
  const res = await apiFetch('/api/admin/logout', { method: 'POST' });
  return res.json();
}

export async function getAuthStatus() {
  const res = await fetch(`${API_BASE}/api/admin/me`, { credentials: 'include' });
  if (!res.ok) return { authenticated: false };
  return res.json();
}