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

export interface VIPCustomer {
  id: string;
  full_name: string;
  phone_number: string;
  address: string;
  preferred_payment_frequency: 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | '';
  outstanding_balance: number;
  order_count: number;
  created_at: string;
}

export interface VIPOrder {
  id: string;
  customer: string;
  customer_name: string;
  product: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  order_date: string;
  created_at: string;
}

export interface VIPPayment {
  id: string;
  customer: string;
  customer_name: string;
  amount: number;
  payment_date: string;
  created_at: string;
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

  getShortagesLedger: (branchId?: string) => 
    salesApi.get(`shortages/${branchId ? `?branch=${branchId}` : ''}`),

  deleteDailySession: (sessionId: string) =>
    salesApi.delete(`sessions/${sessionId}/`),

  getDailySessionDetail: (sessionId: string) =>
    salesApi.get(`sessions/${sessionId}/`),


  /**
   * CROSS-APP QUERY ROUTE: Bypasses the /api/sales/ baseURL scope safely
   * while keeping headers, interceptors, and tokens 100% active.
   */
  getSystemUsers: () => {
    const token = localStorage.getItem('access_token');
    return axios.get('http://localhost:8000/api/users/', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  /**
   * 🌟 CROSS-APP EMPLOYEE LOG PROFILE QUERY ROUTE:
   * Safely bypasses the sales base URL restriction to collect operational records from the new app.
   */
  getEmployeeProfiles: () => {
    const token = localStorage.getItem('access_token');
    return axios.get('http://localhost:8000/api/employee/profiles/', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  },

  /**
   * 🌟 REPAIRED PAYLOAD TYPE DEFINITION:
   * Expanded payload properties parameters verification to easily support our model's new 'employee' key reference identifier.
   */
  settleShortageRecord: (
    id: string, 
    payload: { 
      is_settled_from_salary?: boolean; 
      payroll_cycle_date?: string; 
      manager?: string | null; 
      employee?: string | null; // 🌟 Added property match reference target
    }
  ) => salesApi.patch(`shortages/${id}/`, payload),

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

  // --- 🌟 FIXED WHOLESALE SUPPLIER SETTLEMENTS ENDPOINTS 🌟 ---

  /**
   * Cultivates historical locked settlement batch rows for a vendor.
   * Aligned to router tracking name: vendor-settlements
   */
  getSettlements: (vendorId?: string) => 
    salesApi.get('vendor-settlements/', {
      params: vendorId ? { vendor: vendorId } : {}
    }),

  /**
   * 🌟 UPDATED: Fetches the statement worksheet matching the backend design.
   * Explicitly uses trailing slashes to keep routers happy and handles parameters safely.
   */
  getStatementWorksheet: (vendorId: string, startDate: string, endDate: string) =>
    salesApi.get('vendor-settlements/statement-worksheet/', {
      params: {
        vendor_id: vendorId,
        start_date: startDate,
        end_date: endDate
      }
    }),
    
  /**
   * 🌟 UPDATED: Posts the finalized payload with explicit property alignments.
   */
  createSettlement: (payload: { vendor_id: string; supply_log_ids: string[]; amount_handed_over: number }) => 
    salesApi.post('vendor-settlements/post-settlement/', payload),

  /**
   * Applies individual consecutive cash handovers to clear old remaining debts.
   */
  clearRemainingDebt: (settlementId: string, amountHandedOver: number) =>
    salesApi.post(`vendor-settlements/${settlementId}/clear-debt/`, {
      amount_handed_over: amountHandedOver
    }),

  // --- VIP CUSTOMER MANAGEMENT (Admin-only) ---

  getVipCustomers: (search?: string) =>
    salesApi.get<VIPCustomer[]>('vip-customers/', {
      params: search ? { search } : {}
    }),

  createVipCustomer: (data: { full_name?: string; phone_number?: string; address?: string; preferred_payment_frequency?: string }) =>
    salesApi.post<VIPCustomer>('vip-customers/', data),

  updateVipCustomer: (id: string, data: { full_name?: string; phone_number?: string; address?: string; preferred_payment_frequency?: string }) =>
    salesApi.put<VIPCustomer>(`vip-customers/${id}/`, data),

  deleteVipCustomer: (id: string) =>
    salesApi.delete(`vip-customers/${id}/`),

  getVipOrders: (customerId?: string) =>
    salesApi.get<VIPOrder[]>('vip-orders/', {
      params: { customer: customerId || undefined }
    }),

  createVipOrder: (data: { customer: string; product: string; quantity: number; order_date: string }) =>
    salesApi.post<VIPOrder>('vip-orders/', data),

  updateVipOrder: (orderId: string, data: { product: string; quantity: number; order_date: string }) =>
    salesApi.patch<VIPOrder>(`vip-orders/${orderId}/`, data),

  deleteVipOrder: (orderId: string) =>
    salesApi.delete(`vip-orders/${orderId}/`),

  getVipPayments: (customerId?: string) =>
    salesApi.get<VIPPayment[]>('vip-payments/', {
      params: { customer: customerId || undefined }
    }),

  createVipPayment: (data: { customer: string; amount: number; payment_date: string }) =>
    salesApi.post<VIPPayment>('vip-payments/', data)
};