import axios from 'axios';

// Ensure this matches your backend structure (usually /api/sales/)
const API_URL = 'http://localhost:8000/api/sales/';

const salesApi = axios.create({
  baseURL: API_URL,
});

salesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Type Definitions for Strict Frontend Verification ---

export interface DigitalAccount {
  id: string;
  branch: string;
  name: string;
}

export interface CustomerCreditProfile {
  id: string;
  branch: string;
  customer_name: string;
  total_balance: number;
  last_updated: string;
}

export interface SubmitSessionPayload {
  branch: string | undefined;
  trading_date: string;
  digital_balances: {
    account_id: string;
    balance: number;
  }[];
  manual_deposits: {
    amount: number;
    bank: string;
    account_name: string;
  }[];
  physical_cash_handed_to_admin: number;
  cash_retained_for_change: number;
  products: {
    product_id: string;
    opening_balance: number;
    closing_balance: number;
    unit_price: number;
  }[];
  expenses: {
    reason: string;
    amount: number;
  }[];
  credits: {
    customer_id: string;
    amount: number;
  }[];
  credit_payments: {
    customer_id: string;
    amount: number;
  }[];
}

// --- Combined & Professional Service Implementation ---

export const salesService = {
  // --- DAILY SESSIONS & RECONCILIATION ---
  
  // Matches router.register(r'sessions', DailySessionViewSet)
  getDailySessions: (branchId?: string) => 
    salesApi.get('sessions/', {
      params: branchId ? { branch: branchId } : {}
    }),

  // Matches the @action(detail=False) worksheet setup
  prepareWorksheet: (branchId: string, date: string) => 
    salesApi.get('sessions/prepare/', {
      params: { branch: branchId, date }
    }),

  // Submit the multi-tab nested session payload
  submitDailySession: (data: SubmitSessionPayload) => 
    salesApi.post('sessions/', data),


  // --- DYNAMIC HELPER ENDPOINTS (For Dropdowns & Search) ---

  /**
   * Fetches the pre-configured bank and mobile money accounts belonging 
   * to a targeted branch for Tab 5 dropdown population.
   */
  getDigitalAccounts: (branchId: string) => 
    salesApi.get<DigitalAccount[]>('digital-accounts/', {
      params: { branch: branchId }
    }),

  getGlobalDigitalAccounts: () => 
    salesApi.get('digital-accounts/'),

  createDigitalAccount: (data: { name: string; branch: string }) => 
    salesApi.post('digital-accounts/', data),

  deleteDigitalAccount: (id: string) => 
    salesApi.delete(`digital-accounts/${id}/`),

  updateDigitalAccount: (id: string, data: { name: string; branch: string }) => 
    salesApi.put(`digital-accounts/${id}/`, data),


  getDigitalAdjustments: () => 
    salesApi.get('digital-adjustments/'),

  createDigitalAdjustment: (payload: { account: string; amount: number; reason: string }) => 
    salesApi.post('digital-adjustments/', payload),

  deleteDigitalAdjustment: (id: string) => 
    salesApi.delete(`digital-adjustments/${id}/`),

  /**
   * Dynamic search interface pulling active customer debt accounts.
   * Connects directly to Django's built-in SearchFilter backend.
   * * @param branchId Filter targets by active physical location
   * @param searchString Optional instant string match typed by manager
   * @param activeOnly If true, limits exclusively to people with a remaining debt > 0
   */
  getCustomerCredits: (branchId: string, searchString?: string, activeOnly?: boolean) => 
    salesApi.get<CustomerCreditProfile[]>('customer-credits/', {
      params: {
        branch: branchId,
        search: searchString || undefined,
        active_only: activeOnly ? 'true' : undefined
      }
    }),

    
  createCustomer: (customerData: { customer_name: string, branch: string, total_balance: number }) => 
  salesApi.post('customer-credits/', customerData),

  // --- SUPPLIER SETTLEMENTS (Preserved from original file) ---

  // Matches router.register(r'settlements', SupplierSettlementViewSet)
  getSettlements: (vendorId?: string) => 
    salesApi.get('settlements/', {
      params: vendorId ? { vendor: vendorId } : {}
    }),
    
  createSettlement: (data: any) => 
    salesApi.post('settlements/', data),
};