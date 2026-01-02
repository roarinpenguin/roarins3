import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

export const dashboard = {
  getStats: () => api.get('/dashboard/stats'),
};

export const buckets = {
  list: () => api.get('/buckets'),
  get: (name) => api.get(`/buckets/${name}`),
  create: (data) => api.post('/buckets', data),
  update: (name, data) => api.put(`/buckets/${name}`, data),
  delete: (name, force = false) => api.delete(`/buckets/${name}?force=${force}`),
};

export const objects = {
  list: (bucketName, prefix = '') => api.get(`/buckets/${bucketName}/objects`, { params: { prefix } }),
  upload: (bucketName, objectKey, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/buckets/${bucketName}/objects/${objectKey}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  download: (bucketName, objectKey) => api.get(`/buckets/${bucketName}/objects/${objectKey}`, { responseType: 'blob' }),
  delete: (bucketName, objectKey) => api.delete(`/buckets/${bucketName}/objects/${objectKey}`),
};

export const apiKeys = {
  list: () => api.get('/api-keys'),
  create: (data) => api.post('/api-keys', data),
  get: (id) => api.get(`/api-keys/${id}`),
  updatePermissions: (id, permissions) => api.put(`/api-keys/${id}/permissions`, permissions),
  activate: (id) => api.post(`/api-keys/${id}/activate`),
  deactivate: (id) => api.post(`/api-keys/${id}/deactivate`),
  delete: (id) => api.delete(`/api-keys/${id}`),
};

export const logs = {
  list: (params = {}) => api.get('/logs', { params }),
  pull: (token, params = {}) => api.get('/pull', { params: { token, ...params } }),
};

export const logTokens = {
  list: () => api.get('/log-tokens'),
  create: (data) => api.post('/log-tokens', data),
  delete: (id) => api.delete(`/log-tokens/${id}`),
  reset: (id) => api.post(`/log-tokens/${id}/reset`),
};

export default api;
