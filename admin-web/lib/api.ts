// FIXED: 401 handler now clears admin_token cookie before redirecting to /login
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      try {
        if (typeof window !== 'undefined') {
          // FIXED: clear the stale cookie so middleware doesn't loop
          document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          window.location.href = '/login';
        }
      } catch {}
    }
    return Promise.reject(err);
  }
);

export default api;
