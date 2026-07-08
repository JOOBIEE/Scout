export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:4000';
const API_BASE = `${API_ORIGIN}/api`;
// --- Auth ---

export function getToken() {
  return localStorage.getItem('scout_token');
}

export function setToken(token) {
  localStorage.setItem('scout_token', token);
}

export function clearToken() {
  localStorage.removeItem('scout_token');
}

export async function login(password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error('Incorrect password');
  const data = await response.json();
  setToken(data.token);
  return data;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

function handleAuthFailure(response) {
  if (response.status === 401) {
    clearToken();
    window.location.reload();
  }
}

// --- Search (background job + polling) ---

export async function startSearch(businessType, location) {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ businessType, location }),
  });
  handleAuthFailure(response);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Search failed (${response.status})`);
  }
  return response.json(); // { searchId }
}

export async function getSearchStatus(searchId) {
  const response = await fetch(`${API_BASE}/search/${searchId}/status`, {
    headers: authHeaders(),
  });
  handleAuthFailure(response);
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
}

export async function getSearchResults(searchId) {
  const response = await fetch(`${API_BASE}/search/${searchId}`, {
    headers: authHeaders(),
  });
  handleAuthFailure(response);
  if (!response.ok) throw new Error('Failed to fetch results');
  return response.json();
}

// --- Outreach ---

export async function generateTemplateOutreach(businessId) {
  const response = await fetch(`${API_BASE}/outreach/${businessId}/template`, {
    method: 'POST',
    headers: authHeaders(),
  });
  handleAuthFailure(response);
  if (!response.ok) throw new Error('Failed to generate outreach');
  return response.json();
}

export async function getOutreachPrompt(businessId) {
  const response = await fetch(`${API_BASE}/outreach/${businessId}/prompt`, {
    headers: authHeaders(),
  });
  handleAuthFailure(response);
  if (!response.ok) throw new Error('Failed to get prompt');
  return response.json();
}

// --- CRM ---

export async function updateCrmStatus(businessId, status) {
  const response = await fetch(`${API_BASE}/crm/${businessId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  handleAuthFailure(response);
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
}

// --- Reports ---

export async function generateReport(businessId) {
  const response = await fetch(`${API_BASE}/reports/${businessId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  handleAuthFailure(response);
  if (!response.ok) throw new Error('Failed to generate report');
  return response.json();
}