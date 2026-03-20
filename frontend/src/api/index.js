import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('snag_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
API.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('snag_token');
            localStorage.removeItem('snag_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => API.post('/auth/login', data),
    register: (data) => API.post('/auth/register', data),
    getProfile: () => API.get('/auth/profile'),
    getContractors: () => API.get('/auth/contractors'),
    sendOTP: (phone, email) => API.post('/auth/send-otp', { phone, email }),
    verifyOTP: (phone, otp) => API.post('/auth/verify-otp', { phone, otp }),
    updateProfile: (data) => API.post('/auth/update-profile', data),
};

// ── Projects ──────────────────────────────────────────────────
export const projectAPI = {
    getAll: () => API.get('/projects'),
    getById: (id) => API.get(`/projects/${id}`),
    create: (data) => API.post('/projects', data),
    update: (id, data) => API.put(`/projects/${id}`, data),
};

// ── Snags ─────────────────────────────────────────────────────
export const snagAPI = {
    getAll: (params) => API.get('/snags', { params }),
    getById: (id) => API.get(`/snags/${id}`),
    getStats: () => API.get('/snags/stats'),
    create: (formData) => API.post('/snags', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id, data) => API.put(`/snags/${id}`, data),
    delete: (id) => API.delete(`/snags/${id}`),
    sendReport: (id, data) => API.post(`/snags/${id}/send-report`, data),
    getPreviewReport: (id) => API.get(`/snags/${id}/preview-report`),
    getMailLogs: () => API.get('/snags/mail-logs'),
    updateStatus: (id, data) => API.patch(`/snags/${id}/status`, data),
};

export default API;
