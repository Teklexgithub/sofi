import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/inventory/ProductList'; 
import ProductDetail from './pages/inventory/ProductDetail'; 
import Vendors from './pages/inventory/Vendors';
import VendorDetail from './pages/inventory/VendorDetail';
import StockDetail from './pages/inventory/StockDetail';

import StoreStock from './pages/inventory/StoreStock';
import ShopStock from './pages/inventory/ShopStock';

// Import your future Settings components here
import UserList from './pages/settings/UserList';
import UserDetail from './pages/settings/UserDetail';
import Branches from './pages/settings/Branches';
import BranchDetail from './pages/settings/BranchDetail';



import MainLayout from './layouts/MainLayout';
import { useAuth } from './contexts/AuthContext';
import { Spin } from 'antd';

function App() {
  const { isAuthenticated, loading, user } = useAuth(); // Added 'user' to access role

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
                  <Route path="/" element={<Dashboard />} />
                  
                  {/* Inventory App Routes */}
                  <Route path="/inventory/products" element={<ProductList />} />
                  <Route path="/inventory/products/:id" element={<ProductDetail />} />
                  <Route path="/inventory/vendors" element={<Vendors />} />
                  <Route path="/inventory/vendors/:id" element={<VendorDetail />} />

                  <Route path="/inventory/store" element={<StoreStock />} />
                  <Route path="/inventory/shop" element={<ShopStock />} />
                  <Route path="/inventory/store/:id" element={<StockDetail type="store" />} />
                  <Route path="/inventory/shop/:id" element={<StockDetail type="shop" />} />

                  {/* Settings App - Secure Admin-Only Route */}
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
                        <Navigate to="/" replace /> // Boot non-admins back to dashboard
                      )
                    } 
                  />
                  
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