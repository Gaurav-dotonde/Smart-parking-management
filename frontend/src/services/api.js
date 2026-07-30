import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}`.replace(/\/$/, '')
  : '/api';

const api = axios.create({
  baseURL,
});

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAuthRoute = url.startsWith('/auth/');
  const token = sessionStorage.getItem('token');
  if (token && !isAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV && error.response) {
      console.error('API request failed', {
        status: error.response.status,
        url: error.config?.url,
        body: error.response.data,
      });
    }
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Clean up authentication saved by older versions of the app.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
