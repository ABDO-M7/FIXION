import axios from 'axios';

const DEFAULT_BACKEND_URL = 'https://fixion.onrender.com/api/v1';
const API_URLS = [...new Set([
  process.env.NEXT_PUBLIC_BACKEND_PRIMARY || DEFAULT_BACKEND_URL,
  process.env.NEXT_PUBLIC_BACKEND_FALLBACK || DEFAULT_BACKEND_URL,
].filter(Boolean))];

const api = axios.create({
  baseURL: API_URLS[0],
  withCredentials: true,
  timeout: 30000, // 30 seconds to allow for slower connections
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
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        const res = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data;

        if (accessToken && typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          fetch('/api/auth/set-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: accessToken, refreshToken: newRefreshToken }),
          }).catch(() => {});
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          fetch('/api/auth/set-token', { method: 'DELETE' }).catch(() => {});
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
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
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      fetch('/api/auth/set-token', { method: 'DELETE' }).catch(() => {});
      window.location.href = '/login';
    }
  },
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
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
  generate: (plan: string, quantity: number, expiresAt?: string, courseName?: string, teacherId?: string, groupName?: string, minLength = 16, maxLength = 16, includeLetters = true) =>
    api.post('/codes/generate', { plan, quantity, expiresAt, courseName, teacherId, groupName, minLength, maxLength, includeLetters }),
  list: (params?: any) => api.get('/codes', { params }),
  teacherUsage: (month?: string) => api.get('/codes/teacher-usage', { params: month ? { month } : {} }),
  revoke: (id: string) => api.delete(`/codes/${id}`),
};

export const enrollmentsApi = {
  my: () => api.get('/enrollments/my'),
  one: (id: string) => api.get(`/enrollments/my/${id}`),
};

export const assignmentsApi = {
  // Courses & Groups
  myCourses: () => api.get('/assignments/courses/mine'),
  createCourse: (data: { name: string; color?: string; description?: string }) =>
    api.post('/assignments/courses', data),
  updateCourse: (courseName: string, data: { name?: string; color?: string; description?: string }) =>
    api.patch(`/assignments/courses/${encodeURIComponent(courseName)}`, data),
  deleteCourse: (courseName: string) =>
    api.delete(`/assignments/courses/${encodeURIComponent(courseName)}`),
  groups: (courseName: string) => api.get(`/assignments/courses/${encodeURIComponent(courseName)}/groups`),
  groupsDetailed: (courseName: string) => api.get(`/assignments/courses/${encodeURIComponent(courseName)}/groups-detailed`),
  createGroup: (courseName: string, data: { groupName: string; teacherId?: string; schedule?: string }) =>
    api.post(`/assignments/courses/${encodeURIComponent(courseName)}/groups`, data),
  deleteGroup: (courseName: string, groupName: string) =>
    api.delete(`/assignments/courses/${encodeURIComponent(courseName)}/groups/${encodeURIComponent(groupName)}`),
  // Teacher
  students: (courseName: string, groupName: string) =>
    api.get(`/assignments/courses/${encodeURIComponent(courseName)}/groups/${encodeURIComponent(groupName)}/students`),
  list: (courseName: string, groupName: string, type?: string) =>
    api.get(`/assignments/courses/${encodeURIComponent(courseName)}/groups/${encodeURIComponent(groupName)}`, { params: type ? { type } : {} }),
  create: (data: any) => api.post('/assignments', data),
  submissions: (id: string, courseName: string, groupName: string) =>
    api.get(`/assignments/${id}/submissions`, { params: { courseName, groupName } }),
  grade: (submissionId: string, grade: number, feedback?: string) =>
    api.patch(`/assignments/submissions/${submissionId}/grade`, { grade, feedback }),
  gradeMatrix: (courseName: string, groupName: string) =>
    api.get(`/assignments/courses/${encodeURIComponent(courseName)}/groups/${encodeURIComponent(groupName)}/grades`),
  delete: (id: string) => api.delete(`/assignments/${id}`),
  update: (id: string, data: any) => api.patch(`/assignments/${id}`, data),
  publish: (id: string) => api.patch(`/assignments/${id}/publish`),
  // Student
  myAssignments: (courseName: string, groupName: string) =>
    api.get(`/assignments/student/courses/${encodeURIComponent(courseName)}/groups/${encodeURIComponent(groupName)}`),
  mySubmission: (id: string) => api.get(`/assignments/${id}/my-submission`),
  submit: (id: string, data: any) => api.post(`/assignments/${id}/submissions`, data),
  quizSubmit: (id: string, answers: Record<string, string>) =>
    api.post(`/assignments/${id}/quiz-submit`, { answers }),
  // Quiz questions
  getQuestions: (id: string) => api.get(`/assignments/${id}/questions`),
  createQuestion: (id: string, data: any) => api.post(`/assignments/${id}/questions`, data),
  updateQuestion: (assignmentId: string, qid: string, data: any) =>
    api.patch(`/assignments/${assignmentId}/questions/${qid}`, data),
  deleteQuestion: (assignmentId: string, qid: string) =>
    api.delete(`/assignments/${assignmentId}/questions/${qid}`),
  reorderQuestions: (id: string, orderedIds: string[]) =>
    api.patch(`/assignments/${id}/questions/reorder`, { orderedIds }),
};

export const videosApi = {
  teacherCheckpoints: (videoId: string) => api.get('/videos/' + videoId + '/checkpoints'),
  createCheckpoint: (videoId: string, data: any) => api.post('/videos/' + videoId + '/checkpoints', data),
  updateCheckpoint: (videoId: string, checkpointId: string, data: any) => api.patch('/videos/' + videoId + '/checkpoints/' + checkpointId, data),
  deleteCheckpoint: (videoId: string, checkpointId: string) => api.delete('/videos/' + videoId + '/checkpoints/' + checkpointId),
  studentExperience: (videoId: string) => api.get('/videos/student/video/' + videoId + '/experience'),
  updateProgress: (videoId: string, watchedSeconds: number, durationSeconds: number) =>
    api.patch(`/videos/student/video/${encodeURIComponent(videoId)}/progress`, { watchedSeconds, durationSeconds }),
  answerCheckpoint: (videoId: string, checkpointId: string, data: any) => api.post('/videos/' + videoId + '/checkpoints/' + checkpointId + '/answer', data),
  create: (data: { courseName: string; groupName: string; title: string; description?: string; provider?: string; sourceUrl?: string; youtubeUrl?: string; chapterName?: string; lessonName?: string; contentOrder?: number; unlockRule?: string; unlockAssignmentId?: string; unlockScore?: number; unlockVideoId?: string; unlockPercent?: number; attachments?: string[] }) => api.post('/videos', data),
  update: (id: string, data: any) => api.patch(`/videos/${id}`, data),
  teacherList: (courseName: string, groupName: string) => api.get(`/videos/teacher/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}`),
  studentList: (courseName: string, groupName: string) => api.get(`/videos/student/${encodeURIComponent(courseName)}/${encodeURIComponent(groupName)}`),
  delete: (id: string) => api.delete(`/videos/${id}`),
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
  health: () => api.get('/health/detailed'),
  users: (params?: any) => api.get('/users', { params }),
  createTeacher: (data: { name: string }) => api.post('/users/teachers', data),
  createStaff: (data: { name: string; email: string; password: string; role: string; subjects?: string[]; assignedTeacherId?: string }) =>
    api.post('/users/staff', data),
  updateUserStatus: (id: string, isActive: boolean) => api.patch(`/users/${id}/status`, { isActive }),
  updateUserRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  updateUserSubjects: (id: string, subjects: string[]) => api.patch(`/users/${id}/subjects`, { subjects }),
  updateUserPermissions: (id: string, permissions: Record<string, boolean>) => api.patch(`/users/${id}/permissions`, { permissions }),
  updateAssignedTeacher: (id: string, assignedTeacherId: string) =>
    api.patch(`/users/${id}/assigned-teacher`, { assignedTeacherId }),
  updateUserPassword: (id: string, password: string) =>
    api.patch(`/users/${id}/password`, { password }),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/uploads', form, { 
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // No timeout for file uploads
    });
  },
  uploadMany: async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      urls.push(res.data.url);
    }
    return urls;
  },
};

export const appointmentsApi = {
  create: (dto: { courseName: string; groupName?: string; topic: string; message?: string; preferredTime?: string }) =>
    api.post('/appointments', dto),
  mine: () => api.get('/appointments/mine'),
  teacherList: () => api.get('/appointments/teacher'),
  reply: (id: string, dto: { status: string; teacherReply?: string; scheduledTime?: string }) =>
    api.patch(`/appointments/${id}/reply`, dto),
};
