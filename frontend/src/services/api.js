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

// Student Learning Profile API
export const getStudentProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

export const updateStudentProfile = async (data) => {
  const response = await api.put('/profile', data);
  return response.data;
};

// Topic Knowledge / Skills API
export const getSkills = async (search = '') => {
  const params = search ? { search } : {};
  const response = await api.get('/skills', { params });
  return response.data;
};

export const getTopicKnowledge = getSkills;

export const upsertSkill = async (data) => {
  const response = await api.post('/skills', data);
  return response.data;
};

export const bulkUpsertSkills = async (skills) => {
  const response = await api.post('/skills/bulk', { skills });
  return response.data;
};

export const updateSkillLevel = async (id, level) => {
  const response = await api.patch(`/skills/${id}`, null, { params: { level } });
  return response.data;
};

export const deleteSkill = async (id) => {
  const response = await api.delete(`/skills/${id}`);
  return response.data;
};

// Saved Roadmaps API
export const saveRoadmap = async (data) => {
  const response = await api.post('/ai/roadmaps/save', data);
  return response.data;
};

export const getSavedRoadmaps = async () => {
  const response = await api.get('/ai/roadmaps');
  return response.data;
};

export const getSavedRoadmapById = async (id) => {
  const response = await api.get(`/ai/roadmaps/${id}`);
  return response.data;
};

export const updateRoadmapProgress = async (id, data) => {
  const response = await api.patch(`/ai/roadmaps/${id}/progress`, data);
  return response.data;
};

export const replaceRoadmap = async (id, data) => {
  const response = await api.put(`/ai/roadmaps/${id}/replace`, data);
  return response.data;
};

export const deleteSavedRoadmap = async (id) => {
  const response = await api.delete(`/ai/roadmaps/${id}`);
  return response.data;
};

// Resources API
export const getResources = async () => {
  const response = await api.get('/resources');
  return response.data;
};

export const checkResourceLinks = async (urls) => {
  const response = await api.post('/resources/check', { urls });
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

// Study Sessions API
export const createStudySession = async (data) => {
  const response = await api.post('/sessions', data);
  return response.data;
};

export const getStudySessions = async (params = {}) => {
  const response = await api.get('/sessions', { params });
  return response.data;
};

export const getStudySessionsSummary = async (params = {}) => {
  const response = await api.get('/sessions/summary', { params });
  return response.data;
};

// AI Roadmap API — longer timeout since Gemini calls can take 10-30s
export const generateRoadmap = async (data) => {
  const response = await api.post('/ai/roadmap', data, { timeout: 60000 });
  return response.data;
};

// Progress & Weekly Review API
export const getProgressOverview = async (tz = 'UTC') => {
  const response = await api.get('/progress/overview', { params: { tz } });
  return response.data;
};

export const getWeeklyReview = async (tz = 'UTC') => {
  const response = await api.get('/progress/weekly-review', { params: { tz } });
  return response.data;
};

// Task Feedback API
export const submitTaskFeedback = async (roadmapId, taskId, rating) => {
  const response = await api.put(`/ai/roadmaps/${roadmapId}/tasks/${taskId}/feedback`, { rating });
  return response.data;
};

export default api;
