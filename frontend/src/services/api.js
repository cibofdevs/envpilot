import axios from 'axios';
import { config } from '../config/config';

// Create axios instance
const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Timeout configuration from environment
  timeout: config.API_TIMEOUT,
  // Retry configuration from environment
  retry: config.API_RETRY_COUNT,
  retryDelay: config.API_RETRY_DELAY,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in debug mode
    if (process.env.NODE_ENV === 'development' && config.DEBUG_MODE) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    // Log response in debug mode
    if (process.env.NODE_ENV === 'development' && config.DEBUG_MODE) {
      console.log('API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.response?.data);
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Request timeout - database connection may be slow');
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login only if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Access forbidden. User may not have required permissions.');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => {
    return api.post('/auth/signin', credentials);
  },
  register: (userData) => api.post('/auth/signup', userData),
  logout: () => api.post('/auth/logout'),
  // MFA endpoints
  setupMfa: (token) => api.post('/auth/mfa/setup', {}, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  enableMfa: (mfaRequest, token) => api.post('/auth/mfa/enable', mfaRequest, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  verifyMfa: (mfaRequest, token) => api.post('/auth/mfa/verify', mfaRequest, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  disableMfa: (email) => api.post(`/auth/mfa/disable?email=${encodeURIComponent(email)}`),
  getMfaStatus: (token) => api.get('/auth/mfa/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentProjects: (limit = 5) => api.get(`/dashboard/recent-projects?limit=${limit}`),
  getActiveEnvironments: (limit = 10) => api.get(`/dashboard/active-environments?limit=${limit}`),
  getRecentBuilds: (limit = 10) => api.get(`/dashboard/recent-builds?limit=${limit}`),
  getRecentDeployments: (limit = 10) => api.get(`/dashboard/recent-deployments?limit=${limit}`),
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (project) => api.post('/projects', project),
  update: (id, project) => api.put(`/projects/${id}`, project),
  delete: (id) => api.delete(`/projects/${id}`),
  search: (keyword) => api.get(`/projects/search?keyword=${keyword}`),
  getEnvironments: (id) => api.get(`/projects/${id}/environments`),
  deploy: (id, environmentId, deploymentData) => 
    api.post(`/projects/${id}/deploy?environmentId=${environmentId}`, deploymentData),
  getDeployments: (id) => api.get(`/projects/${id}/deployments`),
  getProjectDeployments: (id) => api.get(`/projects/${id}/deployments`), // Alias for consistency
};

// Environments API
export const environmentsAPI = {
  getById: (id) => api.get(`/environments/${id}`),
  update: (id, environment) => api.put(`/environments/${id}`, environment),
  getFeatureFlags: (id) => api.get(`/environments/${id}/feature-flags`),
  createFeatureFlag: (id, flag) => api.post(`/environments/${id}/feature-flags`, flag),
  updateFeatureFlag: (envId, flagId, flag) => 
    api.put(`/environments/${envId}/feature-flags/${flagId}`, flag),
  deleteFeatureFlag: (envId, flagId) => 
    api.delete(`/environments/${envId}/feature-flags/${flagId}`),
  getConfigurations: (id) => api.get(`/environments/${id}/configurations`),
  createConfiguration: (id, config) => api.post(`/environments/${id}/configurations`, config),
  updateConfiguration: (envId, configId, config) => 
    api.put(`/environments/${envId}/configurations/${configId}`, config),
  deleteConfiguration: (envId, configId) => 
    api.delete(`/environments/${envId}/configurations/${configId}`),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getTrends: (days = 30) => api.get(`/analytics/trends?days=${days}`),
  getDeploymentAnalytics: (days = 30) => api.get(`/analytics/deployments?days=${days}`),
  getEnvironmentMetrics: (days = 30) => api.get(`/analytics/environments?days=${days}`),
  getPerformanceMetrics: (days = 30) => api.get(`/analytics/performance?days=${days}`),
  exportData: (startDate, endDate) => api.get(`/analytics/export?startDate=${startDate}&endDate=${endDate}`),
};

// Users API
export const usersAPI = {
  getUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return api.get(`/users?${queryParams.toString()}`);
  },
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles'),
  getUserStats: () => api.get('/users/stats'),
  uploadProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Settings API
export const settingsAPI = {
  // System settings (Admin only)
  getSystemSettings: () => api.get('/settings/system'),
  updateSystemSettings: (settings) => api.put('/settings/system', settings),
  getSystemInfo: () => api.get('/settings/system-info'),
  getSystemMonitoring: () => api.get('/settings/system-monitoring'),
  getFeatureFlags: () => api.get('/settings/feature-flags'),
  toggleAuditLogging: (enabled) => api.post(`/settings/feature-flags/audit-logging?enabled=${enabled}`),
  toggleEmailNotifications: (enabled) => api.post(`/settings/feature-flags/email-notifications?enabled=${enabled}`),
  toggleRealTimeMonitoring: (enabled) => api.post(`/settings/feature-flags/real-time-monitoring?enabled=${enabled}`),
  // Additional to prevent errors
  getAppInfo: () => api.get('/settings/app-info'),
  getUserPreferences: () => api.get('/settings/preferences'),
  updateUserPreferences: (preferences) => api.put('/settings/preferences', preferences),
  getUserProfile: () => api.get('/settings/profile'),
  updateUserProfile: (profileData) => api.put('/settings/profile', profileData),
  changePassword: (passwordData) => api.put('/settings/password', passwordData),
};

// Jenkins API
export const jenkinsAPI = {
  // Deploy project using backend deployment endpoint (which also triggers Jenkins)
  deployProject: (projectId, environmentId, version, notes, envName) => {
    const data = { 
      version: version
    };
    if (notes) data.notes = notes;
    if (envName) data.envName = envName;
    return api.post(`/projects/${projectId}/deploy?environmentId=${environmentId}`, data);
  },
  
  // Get last build status
  getBuildStatus: (projectId) => api.get(`/jenkins/status/${projectId}`),
  
  // Get build logs
  getBuildLogs: (projectId, buildNumber) => {
    const params = buildNumber ? `?buildNumber=${buildNumber}` : '';
    return api.get(`/jenkins/logs/${projectId}${params}`);
  },
  
  // Get recent builds
  getRecentBuilds: (projectId, limit = 10) => api.get(`/jenkins/builds/${projectId}?limit=${limit}`),
  
  // Test Jenkins connection
  testConnection: (projectId) => api.post(`/jenkins/test/${projectId}`),
  
  // Update Jenkins configuration
  updateConfig: (projectId, config) => api.put(`/jenkins/config/${projectId}`, config),
  
  // Get Jenkins configuration
  getConfig: (projectId) => api.get(`/jenkins/config/${projectId}`),
  
  // Sync deployment status from Jenkins
  syncDeploymentStatus: (deploymentId) => api.post(`/jenkins/sync-deployment/${deploymentId}`),
  
  // Sync all active deployments from Jenkins
  syncAllDeployments: () => api.post('/jenkins/sync-all-deployments'),
  
  // Real-time sync deployment status from Jenkins
  syncDeploymentRealtime: (deploymentId) => api.post(`/jenkins/sync-deployment-realtime/${deploymentId}`),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  clearAll: () => api.delete('/notifications'),
  deleteOne: (notificationId) => api.delete(`/notifications/${notificationId}`),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Project Assignment API
export const projectAssignmentAPI = {
  // Assign users to project
  assignUsersToProject: (projectId, assignmentData) => 
    api.post(`/project-assignments/${projectId}/assign`, assignmentData),
  
  // Get all assignments for a project
  getProjectAssignments: (projectId) => 
    api.get(`/project-assignments/${projectId}`),
  
  // Remove user from project
  removeUserFromProject: (projectId, userId) => 
    api.delete(`/project-assignments/${projectId}/users/${userId}`),
  
  // Get all projects assigned to current user
  getMyProjects: () => 
    api.get('/project-assignments/my-projects'),
  
  // Check if current user has access to a project
  checkProjectAccess: (projectId) => 
    api.get(`/project-assignments/${projectId}/access`),
};

// Environment Assignment API
export const environmentAssignmentAPI = {
  // Assign users to environment
  assignUsersToEnvironment: (assignmentData) => 
    api.post('/environment-assignments/assign', assignmentData),
  
  // Get all assignments for an environment
  getEnvironmentAssignments: (environmentId) => 
    api.get(`/environment-assignments/environment/${environmentId}`),
  
  // Get all environment assignments for a project
  getProjectEnvironmentAssignments: (projectId) => 
    api.get(`/environment-assignments/project/${projectId}`),
  
  // Get all environment assignments for a user
  getUserEnvironmentAssignments: (userId) => 
    api.get(`/environment-assignments/user/${userId}`),
  
  // Remove user from environment
  removeUserFromEnvironment: (environmentId, userId) => 
    api.delete(`/environment-assignments/${environmentId}/users/${userId}`),
  
  // Check if user has access to environment
  checkEnvironmentAccess: (environmentId, userId) => 
    api.get(`/environment-assignments/${environmentId}/access/${userId}`),
  
  // Get active assignments for environment
  getActiveEnvironmentAssignments: (environmentId) => 
    api.get(`/environment-assignments/environment/${environmentId}/active`),
};

export default api;