import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000/api/' });

// Interceptor for JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const settingsService = {
  // Users (using your 'accounts' route)
  getUsers: () => api.get('users/accounts/'),
  getUserDetail: (id: string) => api.get(`users/accounts/${id}/`),
  createUser: (data: any) => api.post('users/accounts/', data),
  updateUser: (id: string, data: any) => api.put(`users/accounts/${id}/`, data),
  deleteUser: (id: string) => api.delete(`users/accounts/${id}/`),

  // Branches
  getBranches: () => api.get('inventory/branches/'),
  getBranchDetail: (id: string) => api.get(`inventory/branches/${id}/`),
  createBranch: (data: any) => api.post('inventory/branches/', data),
  updateBranch: (id: string, data: any) => api.put(`inventory/branches/${id}/`, data),
  deleteBranch: (id: string) => api.delete(`inventory/branches/${id}/`),
};