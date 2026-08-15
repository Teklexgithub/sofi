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

// --- Response shapes (mirror backend/dashboard/views.py exactly) ---

export interface InventoryVendorLedgerRow {
  vendor_id: string;
  vendor_name: string;
  contact_person: string;
  total_pieces_received: number;
  pending_debt: number;
}

export interface InventoryAnalyticsResponse {
  metrics: {
    total_asset_valuation: number;
    active_vendor_debt: number;
    stockout_warning_count: number;
  };
  charts: {
    branch_valuation_split: { branch_name: string; valuation: number }[];
    category_investment_split: { category: string; valuation: number }[];
    refill_timeline_trends: { date: string; packs_moved: number }[];
  };
  vendors_ledger: InventoryVendorLedgerRow[];
}

export interface SalesVendorCreditRow {
  vendor_id: string;
  vendor_name: string;
  advance_prepayment_balance: number;
  total_outstanding_debt: number;
  settlements_status_metrics: { unpaid: number; partial: number; fully_paid: number };
}

export interface SalesAnalyticsResponse {
  metrics: {
    gross_revenue_today: number;
    active_shortages_unsettled: number;
    total_customer_debt: number;
    net_cash_intake_today: number;
  };
  charts: {
    revenue_shortage_timeline: { date: string; gross_sales: number; shortages_logged: number }[];
    branch_sales_leaderboard: { branch_name: string; total_sales_revenue: number }[];
    revenue_composition_mix: {
      physical_cash_percentage: number;
      digital_wallet_percentage: number;
      credit_payouts_percentage: number;
    };
  };
  vendors_credit_ledger: SalesVendorCreditRow[];
}

export interface EmployeeWorkforceLedgerRow {
  employee_id: string;
  full_name: string;
  job_role: string;
  branch_name: string;
  status: string;
  monthly_salary: number;
  tenure_days: number;
  outstanding_advances: number;
  outstanding_fines: number;
  completed_payslips_count: number;
}

export interface EmployeeAnalyticsResponse {
  metrics: {
    total_active_headcount: number;
    unsettled_advances_total: number;
    cumulative_net_payroll: number;
    projected_gross_monthly_payroll: number;
  };
  charts: {
    role_distribution_split: { role_display: string; staff_count: number }[];
    payroll_historical_trends: { month: string; gross_expenditure: number; net_distribution: number }[];
    branch_liability_breakdown: { branch_name: string; cash_advances: number; deduction_fines: number }[];
  };
  workforce_audit_ledger: EmployeeWorkforceLedgerRow[];
}

export const dashboardService = {
  // Phase 1: Inventory Asset Allocation Data Feed
  getInventoryAnalytics: () =>
    dashboardApi.get<InventoryAnalyticsResponse>('inventory-analytics/'),

  // Phase 2: Sales Performance & Revenue Flow Data Feed
  getSalesAnalytics: () =>
    dashboardApi.get<SalesAnalyticsResponse>('sales-analytics/'),

  // Phase 3: Workforce Cost & Payroll Outflow Data Feed
  getEmployeeAnalytics: () =>
    dashboardApi.get<EmployeeAnalyticsResponse>('employee-analytics/'),
};