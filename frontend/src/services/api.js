import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth tokens
api.interceptors.request.use(
  (config) => {
    // In Next.js, localStorage is only available on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API methods - customize based on your backend endpoints
const apiService = {
  // Auth endpoints
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/register', userData),
  verifyToken: () => api.get('/verify-token'),
  
  // Data endpoints - replace with your actual resource endpoints
  getItems: () => api.get('/items'),
  getItemById: (id) => api.get(`/items/${id}`),
  createItem: (data) => api.post('/items', data),
  updateItem: (id, data) => api.put(`/items/${id}`, data),
  deleteItem: (id) => api.delete(`/items/${id}`),
  
  // GIS and routing endpoints
  getGisData: (id) => api.get(`/gisdata/${id}`),
  searchGisRadius: (lat, lng, radius) => api.get(`/gisdata/search/radius?lat=${lat}&lng=${lng}&radius=${radius}`),
  
  // Route endpoints 
  getRoutes: () => api.get('/routes'),
  getRouteById: (id) => api.get(`/routes/${id}`),
  calculateRoute: (origin, destination) => api.post('/routes/calculate', { origin, destination }),
};

export default apiService;
