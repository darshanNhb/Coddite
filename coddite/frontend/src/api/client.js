// src/api/client.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_URL = `${API_BASE}/api/v1`;

/**
 * Base API client configured to always send credentials (cookies)
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Extremely important for cross-origin cookies
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error || response.statusText);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const authApi = {
  signup: (data) => apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  signupVerify: (data) => apiFetch('/auth/signup/verify', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  login: (data) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  forgotPassword: (data) => apiFetch('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  resetPassword: (data) => apiFetch('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getMe: () => apiFetch('/auth/me', {
    method: 'GET'
  }),
  logout: () => apiFetch('/auth/logout', {
    method: 'POST'
  })
};

export const communityApi = {
  list: () => apiFetch('/communities'),
  getBySlug: (slug) => apiFetch(`/communities/${slug}`),
  join: (id) => apiFetch(`/communities/${id}/join`, { method: 'POST' }),
  leave: (id) => apiFetch(`/communities/${id}/leave`, { method: 'POST' }),
};

export const postApi = {
  listFeed: (communityId = null, cursor = null, limit = 20, sort = 'hot', time = 'all') => {
    const params = new URLSearchParams({ limit, sort, time });
    if (communityId) params.append('communityId', communityId);
    if (cursor) params.append('cursor', cursor);
    return apiFetch(`/posts?${params.toString()}`);
  },
  getById: (id) => apiFetch(`/posts/${id}`),
  create: (data) => apiFetch('/posts', { method: 'POST', body: JSON.stringify(data) }),
};

export const commentApi = {
  create: (data) => apiFetch('/comments', { method: 'POST', body: JSON.stringify(data) }),
};

export const voteApi = {
  vote: (targetType, targetId, value) => apiFetch('/votes', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, value })
  })
};
