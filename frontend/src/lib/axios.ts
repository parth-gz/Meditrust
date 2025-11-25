import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Inject JWT automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    // IMPORTANT:
    // Only set JSON headers if request is NOT FormData
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
      config.headers['Accept'] = 'application/json';
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'; // force logout
    }
    return Promise.reject(error);
  }
);

export default api;
