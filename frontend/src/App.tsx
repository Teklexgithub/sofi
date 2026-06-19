import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// INVENTORY APP
import ProductList from './pages/inventory/ProductList'; 
import ProductDetail from './pages/inventory/ProductDetail'; 
import Vendors from './pages/inventory/Vendors';
import VendorDetail from './pages/inventory/VendorDetail';
import StockDetail from './pages/inventory/StockDetail';
import StoreStock from './pages/inventory/StoreStock';
import ShopStock from './pages/inventory/ShopStock';
import InternalTransfers from './pages/inventory/InternalTransfers';
import SupplyLogs from './pages/inventory/SupplyLogs';

// SALES APP - NEW IMPORTS
import DailySessionWorksheet from './pages/sales/DailySessionWorksheet';
import SalesHistoryLog from './pages/sales/SalesHistoryLog';
import DigitalAccountSetup from './pages/sales/DigitalAccountSetup';
import DigitalAccountAdjustments from './pages/sales/DigitalAccountAdjustments';
import ManagerShortagesDashboard from './pages/sales/ManagerShortagesDashboard';
import { VendorSettlements } from './pages/sales/VendorSettlements';
// (Future Settlement page import will go here)

// SETTINGS APP
import UserList from './pages/settings/UserList';
import UserDetail from './pages/settings/UserDetail';
import Branches from './pages/settings/Branches';
import BranchDetail from './pages/settings/BranchDetail';

import MainLayout from './layouts/MainLayout';
import { useAuth } from './contexts/AuthContext';
import { Spin } from 'antd';

function App() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {!isAuthenticated ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route
            path="/*"
            element={
              <MainLayout>
                <Routes>
                  {/* Global Dashboard */}
                  <Route path="/" element={<Dashboard />} />
                  
                  {/* INVENTORY APP */}
                  <Route path="/inventory/products" element={<ProductList />} />
                  <Route path="/inventory/products/:id" element={<ProductDetail />} />
                  <Route path="/inventory/vendors" element={<Vendors />} />
                  <Route path="/inventory/vendors/:id" element={<VendorDetail />} />
                  <Route path="/inventory/store" element={<StoreStock />} />
                  <Route path="/inventory/shop" element={<ShopStock />} />
                  <Route path="/inventory/store/:id" element={<StockDetail type="store" />} />
                  <Route path="/inventory/shop/:id" element={<StockDetail type="shop" />} />

                  {/* FIXED ROUTES: Matches the navigate paths from the tables */}
                  <Route path="/inventory/stock/store/:id" element={<StockDetail type="store" />} />
                  <Route path="/inventory/stock/shop/:id" element={<StockDetail type="shop" />} />

                  <Route path="/inventory/transfers" element={<InternalTransfers />} />
                  <Route path="/inventory/supply-logs" element={<SupplyLogs />} />

                  {/* SALES APP - NEW ROUTES */}
                  <Route path="/sales" element={<Navigate to="/sales/daily-session" replace />} />
                  <Route path="/sales/daily-session" element={<DailySessionWorksheet />} />
                  <Route path="/sales/history" element={<SalesHistoryLog />} />
                  <Route path="/sales/digital-accounts-setup" element={<DigitalAccountSetup />} />
                  <Route path="/sales/digital-adjustments" element={<DigitalAccountAdjustments />} />
                  <Route path="/sales/shortages-ledger" element={<ManagerShortagesDashboard />} />
                  {/* <Route path="/sales/settlements" element={<SupplierSettlements />} /> */}
                  <Route path="/sales/settlements" element={<VendorSettlements />} />

                  {/* SETTINGS APP - Secure Admin-Only Route */}
                  <Route 
                    path="/settings/*" 
                    element={
                      user?.role === 'ADMIN' ? (
                        <Routes>
                          <Route path="users" element={<UserList />} />
                          <Route path="users/:id" element={<UserDetail />} />
                          <Route path="branches" element={<Branches />} />
                          <Route path="branches/:id" element={<BranchDetail />} />
                        </Routes>
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Fallback to Dashboard */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            }
          />
        )}
      </Routes>
    </Router>
  );
}

export default App;