import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — clear token so AuthContext logs user out cleanly
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const busAPI = {
  getAll: () => api.get('/buses'),
  getOne: (id) => api.get(`/buses/${id}`),
  getLocation: (id) => api.get(`/buses/${id}/location`),
};

export const routeAPI = {
  getAll: () => api.get('/routes'),
  getOne: (id) => api.get(`/routes/${id}`),
};

export default api;
