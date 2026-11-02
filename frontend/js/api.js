// ============================================================
//  js/api.js — Centralized API Client with JWT Auth & Error Handling
// ============================================================

// Connect to backend: if served locally on a dev port (e.g., :3000), point to localhost:5000;
// when live on Netlify or custom domain, route through relative /api
const isLocal = typeof window !== 'undefined' && window.location &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = (isLocal && window.location.port && window.location.port !== '5000')
  ? 'http://localhost:5000/api'
  : '/api';

const Auth = {
  getToken() {
    return localStorage.getItem('erp_token');
  },
  setToken(token) {
    if (token) localStorage.setItem('erp_token', token);
    else localStorage.removeItem('erp_token');
  },
  getUser() {
    try {
      const u = localStorage.getItem('erp_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    if (user) localStorage.setItem('erp_user', JSON.stringify(user));
    else localStorage.removeItem('erp_user');
  },
  logout(redirect = 'login.html') {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.location.href = redirect;
  },
  requireAuth(allowedRoles = []) {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      window.location.href = 'login.html';
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert(`Access denied. Role '${user.role}' cannot access this portal.`);
      if (user.role === 'admin') window.location.href = 'admin-dashboard.html';
      else if (user.role === 'staff') window.location.href = 'staff-dashboard.html';
      else window.location.href = 'student-dashboard.html';
      return null;
    }

    return user;
  },
};

async function apiRequest(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

    if (res.status === 401) {
      Auth.logout();
      throw new Error(data.message || 'Session expired. Please log in again.');
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

const API = {
  // Auth
  auth: {
    login: (email, password, role) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }),
    me: () => apiRequest('/auth/me'),
  },

  // Stats
  stats: {
    get: () => apiRequest('/stats'),
  },

  // Students (Module 1)
  students: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiRequest(`/students${q ? '?' + q : ''}`);
    },
    getOne: (id) => apiRequest(`/students/${id}`),
    getMyProfile: () => apiRequest('/students/profile/me'),
    create: (data) =>
      apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiRequest(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiRequest(`/students/${id}`, {
        method: 'DELETE',
      }),
  },

  // Staff Accounts
  staff: {
    getAll: () => apiRequest('/staff'),
    create: (data) =>
      apiRequest('/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiRequest(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiRequest(`/staff/${id}`, {
        method: 'DELETE',
      }),
  },

  // Final Year Projects (Module 2)
  finalProjects: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiRequest(`/final-projects${q ? '?' + q : ''}`);
    },
    getOne: (id) => apiRequest(`/final-projects/${id}`),
    create: (formData) =>
      apiRequest('/final-projects', {
        method: 'POST',
        body: formData,
      }),
    update: (id, formData) =>
      apiRequest(`/final-projects/${id}`, {
        method: 'PUT',
        body: formData,
      }),
    delete: (id) =>
      apiRequest(`/final-projects/${id}`, {
        method: 'DELETE',
      }),
  },

  // Internship Reports (Module 3)
  internships: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiRequest(`/internships${q ? '?' + q : ''}`);
    },
    getOne: (id) => apiRequest(`/internships/${id}`),
    create: (formData) =>
      apiRequest('/internships', {
        method: 'POST',
        body: formData,
      }),
    update: (id, formData) =>
      apiRequest(`/internships/${id}`, {
        method: 'PUT',
        body: formData,
      }),
    delete: (id) =>
      apiRequest(`/internships/${id}`, {
        method: 'DELETE',
      }),
  },

  // Semester Marks (Module 4)
  semesterMarks: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiRequest(`/marks/semester${q ? '?' + q : ''}`);
    },
    create: (data) =>
      apiRequest('/marks/semester', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiRequest(`/marks/semester/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiRequest(`/marks/semester/${id}`, {
        method: 'DELETE',
      }),
    getStudentSummary: (regNo, sem) =>
      apiRequest(`/marks/semester/student-summary/${encodeURIComponent(regNo)}/${encodeURIComponent(sem)}`),
    getMarklistPdfUrl: (regNo, sem) => {
      const token = Auth.getToken();
      return `${API_BASE}/marks/semester/pdf-view/${encodeURIComponent(regNo)}/${encodeURIComponent(sem)}?token=${encodeURIComponent(token || '')}`;
    },
  },

  // CIA Marks (Module 5 & 6)
  ciaMarks: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiRequest(`/marks/cia${q ? '?' + q : ''}`);
    },
    create: (data) =>
      apiRequest('/marks/cia', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiRequest(`/marks/cia/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiRequest(`/marks/cia/${id}`, {
        method: 'DELETE',
      }),
  },

  // File Download helper
  getFileDownloadUrl: (type, id) => {
    const token = Auth.getToken();
    return `${API_BASE}/files/download/${type}/${id}?token=${encodeURIComponent(token || '')}`;
  },
  getFilePreviewUrl: (type, id) => {
    const token = Auth.getToken();
    return `${API_BASE}/files/preview/${type}/${id}?token=${encodeURIComponent(token || '')}`;
  },
};
