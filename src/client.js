// This API is protected by a login (see the Auth section below). Every
// admin request needs to send the session cookie Flask sets at login,
// which requires credentials: 'include' AND requires this app and the
// Flask API to be treated as the "same site" by the browser.
//
// THE #1 THING THAT BREAKS THIS: browsers treat "localhost" and
// "127.0.0.1" as two totally different sites for cookie purposes, even
// though they're the same machine. If this app is opened at
// http://localhost:3000 but API_BASE pointed at http://127.0.0.1:5000
// (or vice versa), the session cookie gets silently blocked on every
// request after login, and you'd see a 401 immediately followed by a
// bounce back to the login page.
//
// FIX: instead of hardcoding a hostname, this reads whatever hostname
// the browser actually used to load this app (window.location.hostname)
// and targets the Flask API on that SAME hostname. Whether you open this
// app via localhost:3000 or 127.0.0.1:3000, the API call automatically
// matches -- there's no wrong way to type the URL anymore.
const DEFAULT_API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:5000`
    : window.location.origin;

export const API_BASE = process.env.REACT_APP_API_BASE || DEFAULT_API_BASE;

/**
 * Wraps fetch() with the two things every admin request needs:
 *  - credentials: 'include'  -> sends/receives the Flask session cookie
 *  - 401 handling            -> the session expired or was never there;
 *                                send the person to the login page.
 */
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
    window.location.href = '/admin/login';
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
  // Deliberately plain fetch (not apiFetch) -- a failed "am I logged in?"
  // check should not itself trigger a redirect loop to /login.
  const res = await fetch(`${API_BASE}/api/admin/me`, { credentials: 'include' });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------

export async function fetchProducts() {
  const res = await apiFetch('/api/products');
  return res.json();
}

export async function createProduct(payload) {
  const res = await apiFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not create product');
  return data;
}

export async function updateProduct(id, payload) {
  const res = await apiFetch(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not update product');
  return data;
}

export async function uploadProductImage(file) {
  // Deliberately NOT using apiFetch here: it auto-adds a JSON Content-Type
  // header whenever a body is present, which breaks multipart/form-data
  // uploads (the browser needs to set that header itself, including the
  // boundary string).
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/api/products/upload-image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (response.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Session expired. Redirecting to login…');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Image upload failed');
  return data; // { url: "/static/images/xxxx.jpg" }
}

export async function deleteProduct(id) {
  const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not delete product');
  return data;
}

// ---------------------------------------------------------------------
// Quote requests
// ---------------------------------------------------------------------

export async function fetchQuoteRequests({ status, page = 1, perPage = 20 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  params.set('page', page);
  params.set('per_page', perPage);

  const res = await apiFetch(`/api/quote-requests?${params.toString()}`);
  // Shape: { items, page, per_page, total, total_pages }
  return res.json();
}

export async function updateQuoteStatus(id, status) {
  const res = await apiFetch(`/api/quote-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not update status');
  return data;
}

// ---------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------

export async function fetchTestimonials(status) {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiFetch(`/api/testimonials/admin${query}`);
  return res.json();
}

export async function updateTestimonialStatus(id, status) {
  const res = await apiFetch(`/api/testimonials/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not update status');
  return data;
}

export async function deleteTestimonial(id) {
  const res = await apiFetch(`/api/testimonials/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not delete testimonial');
  return data;
}

// ---------------------------------------------------------------------
// Projects (before/after portfolio)
// ---------------------------------------------------------------------

export async function fetchProjects() {
  const res = await apiFetch('/api/projects');
  return res.json();
}

export async function uploadProjectImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/api/projects/upload-image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (response.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Session expired. Redirecting to login…');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Image upload failed');
  return data; // { url: "/static/images/xxxx.jpg" }
}

export async function createProject(payload) {
  const res = await apiFetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not create project');
  return data;
}

export async function updateProject(id, payload) {
  const res = await apiFetch(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not update project');
  return data;
}

export async function deleteProject(id) {
  const res = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not delete project');
  return data;
}
