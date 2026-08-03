const BACKEND_PORT = 5000;

// Production: use the deployed Flask backend.
// Local development: use the local Flask server.
export const API_BASE =
process.env.REACT_APP_API_BASE ||
(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
? `http://${window.location.hostname}:${BACKEND_PORT}`
: 'https://crystalline-finnish-mixu.onrender.com');

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

if (!res.ok) {
throw new Error(data.error || 'Login failed');
}

return data;
}

export async function logout() {
const res = await apiFetch('/api/admin/logout', {
method: 'POST',
});

return res.json();
}

export async function getAuthStatus() {
const res = await fetch(`${API_BASE}/api/admin/me`, {
credentials: 'include',
});

if (!res.ok) {
return { authenticated: false };
}

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

if (!res.ok) {
throw new Error(data.error || 'Could not create product');
}

return data;
}

export async function updateProduct(id, payload) {
const res = await apiFetch(`/api/products/${id}`, {
method: 'PUT',
body: JSON.stringify(payload),
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not update product');
}

return data;
}

export async function uploadProductImage(file) {
const formData = new FormData();
formData.append('image', file);

const response = await fetch(`${API_BASE}/api/products/upload-image`, {
method: 'POST',
credentials: 'include',
body: formData,
});

if (response.status === 401) {
window.location.href = '/login';
throw new Error('Session expired. Redirecting to login…');
}

const data = await response.json();

if (!response.ok) {
throw new Error(data.error || 'Image upload failed');
}

return data;
}

export async function deleteProduct(id) {
const res = await apiFetch(`/api/products/${id}`, {
method: 'DELETE',
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not delete product');
}

return data;
}

// ---------------------------------------------------------------------
// Quote requests
// ---------------------------------------------------------------------

export async function fetchQuoteRequests({
status,
page = 1,
perPage = 20,
} = {}) {
const params = new URLSearchParams();

if (status && status !== 'all') {
params.set('status', status);
}

params.set('page', page);
params.set('per_page', perPage);

const res = await apiFetch(
`/api/quote-requests?${params.toString()}`
);

return res.json();
}

export async function updateQuoteStatus(id, status) {
const res = await apiFetch(`/api/quote-requests/${id}/status`, {
method: 'PATCH',
body: JSON.stringify({ status }),
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not update status');
}

return data;
}

// ---------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------

export async function fetchTestimonials(status) {
const query =
status && status !== 'all'
? `?status=${encodeURIComponent(status)}`
: '';

const res = await apiFetch(
`/api/testimonials/admin${query}`
);

return res.json();
}

export async function updateTestimonialStatus(id, status) {
const res = await apiFetch(`/api/testimonials/${id}/status`, {
method: 'PATCH',
body: JSON.stringify({ status }),
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not update status');
}

return data;
}

export async function deleteTestimonial(id) {
const res = await apiFetch(`/api/testimonials/${id}`, {
method: 'DELETE',
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not delete testimonial');
}

return data;
}

// ---------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------

export async function fetchProjects() {
const res = await apiFetch('/api/projects');
return res.json();
}

export async function uploadProjectImage(file) {
const formData = new FormData();
formData.append('image', file);

const response = await fetch(
`${API_BASE}/api/projects/upload-image`,
{
method: 'POST',
credentials: 'include',
body: formData,
}
);

if (response.status === 401) {
window.location.href = '/login';
throw new Error('Session expired. Redirecting to login…');
}

const data = await response.json();

if (!response.ok) {
throw new Error(data.error || 'Image upload failed');
}

return data;
}

export async function createProject(payload) {
const res = await apiFetch('/api/projects', {
method: 'POST',
body: JSON.stringify(payload),
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not create project');
}

return data;
}

export async function updateProject(id, payload) {
const res = await apiFetch(`/api/projects/${id}`, {
method: 'PUT',
body: JSON.stringify(payload),
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not update project');
}

return data;
}

export async function deleteProject(id) {
const res = await apiFetch(`/api/projects/${id}`, {
method: 'DELETE',
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || 'Could not delete project');
}

return data;
}
