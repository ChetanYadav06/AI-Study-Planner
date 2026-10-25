import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (localStorage.getItem('token') && !error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/user/profile');
  return response.data;
};

// Goals API
export const getGoals = async () => {
  const response = await api.get('/goals');
  return response.data;
};
export const getUserGoals = getGoals;

export const createGoal = async (data) => {
  const response = await api.post('/goals', data);
  return response.data;
};

export const getGoalById = async (id) => {
  const response = await api.get(`/goals/${id}`);
  return response.data;
};

export const updateGoalStatus = async (id, data) => {
  const response = await api.patch(`/goals/${id}/status`, data);
  return response.data;
};

export const deleteGoal = async (id) => {
  const response = await api.delete(`/goals/${id}`);
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

// AI Roadmap API — longer timeout since Gemini calls can take 10-30s
export const generateRoadmap = async (data) => {
  const response = await api.post('/ai/roadmap', data, { timeout: 60000 });
  return response.data;
};

export default api;
