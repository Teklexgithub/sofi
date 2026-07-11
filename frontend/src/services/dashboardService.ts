import axios from 'axios';

// Aligning explicitly with your corporate backend API URL structure
const API_URL = 'http://localhost:8000/api/dashboard/';

const dashboardApi = axios.create({
  baseURL: API_URL,
});

// Syncing token interceptor structure exactly with your core auth ecosystem
dashboardApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token'); // Matches your exact storage key
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardService = {
  // Phase 1: Inventory Asset Allocation Data Feed
  getInventoryAnalytics: () => 
    dashboardApi.get('inventory-analytics/'),

  // Phase 2: Sales Performance & Revenue Flow Data Feed
  getSalesAnalytics: () => 
    dashboardApi.get('sales-analytics/'),

  // Phase 3: Workforce Cost & Payroll Outflow Data Feed
  getEmployeeAnalytics: () => 
    dashboardApi.get('employee-analytics/'),
};