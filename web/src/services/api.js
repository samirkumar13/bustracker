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

// In-memory GET cache — 60s TTL. Keeps page navigation instant during demo.
const _cache = new Map();
const TTL = 60_000;
const _get = api.get.bind(api);
api.get = (url, config) => {
  const key = url;
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.promise;
  const promise = _get(url, config);
  _cache.set(key, { promise, ts: Date.now() });
  promise.catch(() => _cache.delete(key));
  return promise;
};

export default api;
