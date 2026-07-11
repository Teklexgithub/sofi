import axios from 'axios';

const API_URL = 'http://localhost:8000/api/employee/';

const employeeApi = axios.create({
  baseURL: API_URL,
});

employeeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const employeeService = {
  // Profiles
  getProfiles: (search?: string) => 
    employeeApi.get('profiles/', { params: search ? { search } : {} }),
  createProfile: (formData: FormData) => 
  employeeApi.post('profiles/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProfile: (id: string, data: any) => 
    employeeApi.patch(`profiles/${id}/`, data),

  // Ledger Entries (Advances & Fines)
  getLedgerEntries: (employeeId?: string) => 
    employeeApi.get('ledger/', { params: employeeId ? { employee_id: employeeId } : {} }),
  createLedgerEntry: (payload: { employee: string; entry_type: 'ADVANCE' | 'ADJUSTMENT'; amount: number; description: string }) => 
    employeeApi.post('ledger/', payload),
  

  // Payroll/Payslips
  calculatePayroll: (employeeId: string) => 
    employeeApi.get('payslips/calculate-payroll/', { params: { employee_id: employeeId } }),
  executePayslip: (payload: { employee: string; notes?: string }) => 
    employeeApi.post('payslips/', payload),
  getPayslipsHistory: () => 
    employeeApi.get('payslips/'),
  
};