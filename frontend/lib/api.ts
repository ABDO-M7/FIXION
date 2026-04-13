import axios from 'axios';

const API_URLS = [
  process.env.NEXT_PUBLIC_BACKEND_PRIMARY || 'http://localhost:3001/api/v1',
  process.env.NEXT_PUBLIC_BACKEND_FALLBACK || 'http://localhost:3001/api/v1',
];

const api = axios.create({
  baseURL: API_URLS[0],
  withCredentials: true,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token from localStorage if present (for SSR fallback)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 and backend failover
let currentUrlIndex = 0;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Backend failover
    if (!error.response && currentUrlIndex < API_URLS.length - 1) {
      currentUrlIndex++;
      api.defaults.baseURL = API_URLS[currentUrlIndex];
      console.warn(`Switching to fallback backend: ${API_URLS[currentUrlIndex]}`);
      return api(originalRequest);
    }

    // Auto-refresh on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// Typed API helpers
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  googleLogin: () => { window.location.href = `${API_URLS[0]}/auth/google`; },
};

export const questionsApi = {
  submit: (data: any) => api.post('/questions', data),
  myQuestions: (page = 1, limit = 10) => api.get('/questions/my', { params: { page, limit } }),
  all: (params?: any) => api.get('/questions', { params }),
  one: (id: string) => api.get(`/questions/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/questions/${id}/status`, { status }),
  assignCategory: (id: string, categoryId: string) => api.patch(`/questions/${id}/category`, { categoryId }),
  delete: (id: string) => api.delete(`/questions/${id}`),
};

export const answersApi = {
  create: (questionId: string, data: any) => api.post(`/questions/${questionId}/answers`, data),
  byQuestion: (questionId: string) => api.get(`/questions/${questionId}/answers`),
  update: (id: string, data: any) => api.patch(`/answers/${id}`, data),
  delete: (id: string) => api.delete(`/answers/${id}`),
};

export const subscriptionsApi = {
  redeem: (code: string) => api.post('/subscriptions/redeem', { code }),
  status: () => api.get('/subscriptions/status'),
  all: (page = 1) => api.get('/subscriptions', { params: { page } }),
};

export const codesApi = {
  generate: (plan: string, quantity: number, expiresAt?: string) =>
    api.post('/codes/generate', { plan, quantity, expiresAt }),
  list: (params?: any) => api.get('/codes', { params }),
  revoke: (id: string) => api.delete(`/codes/${id}`),
};

export const categoriesApi = {
  list: (subject?: string) => api.get('/categories', { params: { subject } }),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data),
};

export const notificationsApi = {
  list: (page = 1) => api.get('/notifications', { params: { page } }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
};

export const adminApi = {
  overview: () => api.get('/admin/analytics/overview'),
  users: (params?: any) => api.get('/users', { params }),
  updateUserStatus: (id: string, isActive: boolean) => api.patch(`/users/${id}/status`, { isActive }),
  updateUserRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
