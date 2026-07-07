const API_BASE = 'http://localhost:4000/api';

export const API_ORIGIN = 'http://localhost:4000';


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

export async function runSearch(businessType, location) {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ businessType, location }),
  });

  if (response.status === 401) {
    clearToken();
    window.location.reload(); // kicks back to login screen
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Search failed (${response.status})`);
  }

  return response.json();
}

export async function generateTemplateOutreach(businessId) {
  const response = await fetch(`${API_BASE}/outreach/${businessId}/template`, 
    { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
  if (!response.ok) throw new Error('Failed to generate outreach');
  return response.json();
}

export async function getOutreachPrompt(businessId) {
  const response = await fetch(`${API_BASE}/outreach/${businessId}/prompt`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Failed to get prompt');
  return response.json();
}

export async function updateCrmStatus(businessId, status) {
  const response = await fetch(`${API_BASE}/crm/${businessId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
}

export async function generateReport(businessId) {
  const response = await fetch(`${API_BASE}/reports/${businessId}`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to generate report');
  return response.json();
}