import axios from 'axios';

const PROD_API = 'https://bustracker-production-b1c6.up.railway.app/api';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || PROD_API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
