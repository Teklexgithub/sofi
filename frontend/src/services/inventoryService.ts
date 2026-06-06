import axios from 'axios';

const API_URL = 'http://localhost:8000/api/inventory/';

const inventoryApi = axios.create({
  baseURL: API_URL,
});

// Automatically add the JWT token to every request
inventoryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const inventoryService = {
  // Products
  getProducts: () => inventoryApi.get('products/'),
  getProductDetail: (id: string) => inventoryApi.get(`products/${id}/`),
  createProduct: (data: any) => inventoryApi.post('products/', data),
  updateProduct: (id: string, data: any) => inventoryApi.put(`products/${id}/`, data),
  deleteProduct: (id: string) => inventoryApi.delete(`products/${id}/`),

  getBranches: () => inventoryApi.get('branches/'),

  // Vendors
  getVendors: () => inventoryApi.get('vendors/'),
  getVendorDetail: (id: string) => inventoryApi.get(`vendors/${id}/`),
  createVendor: (data: any) => inventoryApi.post('vendors/', data),
  updateVendor: (id: string, data: any) => inventoryApi.put(`vendors/${id}/`, data),
  deleteVendor: (id: string) => inventoryApi.delete(`vendors/${id}/`),

  // Stock (Packs & Pieces)
  getStoreStock: (branchId?: string) => 
    inventoryApi.get(`store-stock/${branchId ? `?branch=${branchId}` : ''}`),
  getStoreStockDetail: (id: string) => inventoryApi.get(`store-stock/${id}/`),
  
  getShopStock: (branchId?: string) => 
    inventoryApi.get(`shop-stock/${branchId ? `?branch=${branchId}` : ''}`),
  getShopStockDetail: (id: string) => inventoryApi.get(`shop-stock/${id}/`),

  // Manual creation/adjustment - FIXED: data is now being passed
  createShopStock: (data: any) => inventoryApi.post('shop-stock/', data),
  updateShopStock: (id: string, data: any) => inventoryApi.patch(`shop-stock/${id}/`, data),
  
  createStoreStock: (data: any) => inventoryApi.post('store-stock/', data),
  updateStoreStock: (id: string, data: any) => inventoryApi.patch(`store-stock/${id}/`, data),

  // --- NEW ADMIN ADJUSTMENT METHODS ---
  // These point to the custom @actions we added to the backend ViewSets
  adjustStoreStock: (id: string, qty: number) => 
    inventoryApi.post(`store-stock/${id}/adjust/`, { new_quantity: qty }),

  adjustShopStock: (id: string, qty: number) => 
    inventoryApi.post(`shop-stock/${id}/adjust/`, { new_quantity: qty }),


  

  // Operations: Actions
  logSupply: (data: any) => inventoryApi.post('supply-logs/', data),
  
  /**
   * Bulk Supply Log
   * Handles 10+ items from multiple vendors in one request
   */
  bulkCreateSupplyLog: (data: any) => inventoryApi.post('supply-logs/bulk-create/', data),

  transferStock: (data: any) => inventoryApi.post('internal-transfers/', data),

  // OPERATIONS: History/Logs
  getSupplyLogs: (branchId?: string) => 
    inventoryApi.get(`supply-logs/${branchId ? `?branch=${branchId}` : ''}`),
    
  getInternalTransfers: (branchId?: string) => 
    inventoryApi.get(`internal-transfers/${branchId ? `?branch=${branchId}` : ''}`),
};