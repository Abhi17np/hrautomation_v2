import axios from 'axios';

// Shared axios instance for new code (e.g. the platform-admin surface).
// Existing pages still use the raw `axios` default instance with
// axios.defaults.headers.common['Authorization'] set by AuthContext —
// this instance is separate on purpose, since the platform admin token
// is stored under a different localStorage key (`platform_token`) and
// must never be sent on ordinary tenant API calls, or vice versa.
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('platform_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 422) {
      const url = err.config?.url || '';
      if (!url.includes('/platform/login')) {
        localStorage.removeItem('platform_token');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
