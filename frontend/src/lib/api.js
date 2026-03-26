import axios from 'axios';

const api = axios.create({ baseURL: 'http://49.12.195.247:5210/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
