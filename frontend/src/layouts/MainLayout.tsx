import React, { useState, useEffect } from 'react';
import { Layout, Avatar, Dropdown, Badge, Space, Typography, Switch, Menu, Select } from 'antd';
import type { MenuProps } from 'antd';
import { 
  BellOutlined, UserOutlined, LogoutOutlined, 
  LockOutlined, AppstoreOutlined, BulbOutlined,
  EnvironmentOutlined 
} from '@ant-design/icons';
import { useAuth, api } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const { Header, Content } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // State for Branch Switcher
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('settings/branches/');
        setBranches(res.data);
        if (res.data.length > 0) setSelectedBranch(res.data[0].id);
      } catch (e) { 
        console.error("Failed to load branches"); 
      }
    };
    fetchBranches();
  }, []);

  const isInventoryModule = location.pathname.startsWith('/inventory');
  const isSettingsModule = location.pathname.startsWith('/settings');

  // Navigation Items for Inventory
  const inventoryItems: MenuProps['items'] = [
    { 
      key: 'overview', 
      label: 'Stock Levels',
      children: [
        { key: '/inventory/store', label: 'Store Stock (Packs)', onClick: () => navigate('/inventory/store') },
        { key: '/inventory/shop', label: 'Shop Stock (Pieces)', onClick: () => navigate('/inventory/shop') },
      ]
    },
    { 
      key: 'products_nav', 
      label: 'Master Data',
      children: [
        { key: '/inventory/products', label: 'Products', onClick: () => navigate('/inventory/products') },
        { key: '/inventory/vendors', label: 'Vendors', onClick: () => navigate('/inventory/vendors') },
      ]
    },
    { 
      key: 'operations', 
      label: 'Operations',
      children: [
        { key: '/inventory/supply-logs', label: 'Vendor Deliveries', onClick: () => navigate('/inventory/supply-logs') },
        { key: '/inventory/transfers', label: 'Store to Shop Refills', onClick: () => navigate('/inventory/transfers') },
      ]
    },
  ];

  // Navigation Items for Settings
  const settingsItems: MenuProps['items'] = [
    {
      key: 'configuration',
      label: 'Configuration',
      children: [
        { key: '/settings/users', label: 'Users', onClick: () => navigate('/settings/users') },
        { key: '/settings/branches', label: 'Branches', onClick: () => navigate('/settings/branches') },
      ]
    }
  ];

  // User Dropdown Menu - FIXED TypeScript Error here
  const userItems: MenuProps['items'] = [
    { key: 'profile', label: 'My Profile', icon: <UserOutlined /> },
    { 
      key: 'theme-toggle', 
      label: (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%',
          minWidth: '130px' 
        }}>
          <span>Dark Mode</span>
          <Switch 
            size="small" 
            checked={isDark} 
            onChange={toggleTheme} 
          />
        </div>
      )
    },
    { type: 'divider' },
    { 
      key: 'logout', 
      label: 'Logout', 
      icon: <LogoutOutlined />, 
      onClick: logout, 
      danger: true 
    },
  ];

  const getHeaderBackground = () => {
    if (isDark) return '#1f1f1f';
    return '#714B67'; // Your custom Sofia Purple
  };

//   const getHeaderBackground = () => {
//     // 1. If Dark Mode is on, use the dark grey
//     if (isDark) return '#1f1f1f';
    
//     // 2. If we are on the Root Dashboard, use white
//     if (location.pathname === '/') return '#ffffff';
    
//     // 3. For all other modules (Inventory, Settings), use Sofia Purple
//     return '#714B67'; 
//   };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: getHeaderBackground(), 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 20px',
        height: '46px',
        zIndex: 1000,
        borderBottom: isDark ? 'none' : '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* LEFT: App Switcher */}
        <Space size="large" style={{ marginRight: '24px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <AppstoreOutlined style={{ color: '#fff', fontSize: '20px' }} />
          </Link>
          <Typography.Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>
            {isSettingsModule ? 'Settings' : (isInventoryModule ? 'Inventory' : 'Sofia ERP')}
          </Typography.Text>
        </Space>

        {/* MIDDLE: Module Menus */}
        <div style={{ flex: 1 }}>
          {isInventoryModule && (
            <Menu 
              mode="horizontal" 
              theme="dark" 
              items={inventoryItems} 
              selectedKeys={[location.pathname]}
              style={{ background: 'transparent', border: 'none', lineHeight: '46px' }} 
            />
          )}
          {isSettingsModule && (
            <Menu 
              mode="horizontal" 
              theme="dark" 
              items={settingsItems} 
              selectedKeys={[location.pathname]}
              style={{ background: 'transparent', border: 'none', lineHeight: '46px' }} 
            />
          )}
        </div>

        {/* RIGHT: Branch Switcher & User */}
        <Space size="middle">
          {(isInventoryModule || isSettingsModule) && (
            <Select
              size="small"
              value={selectedBranch}
              onChange={setSelectedBranch}
              suffixIcon={<EnvironmentOutlined style={{ color: 'rgba(255,255,255,0.7)' }} />}
              style={{ width: 160 }}
              variant="borderless"
              dropdownStyle={{ zIndex: 1100 }}
              className="branch-select"
            >
              {branches.map(b => (
                <Select.Option key={b.id} value={b.id}>
                  <span style={{ color: isDark ? '#fff' : '#000' }}>{b.name}</span>
                </Select.Option>
              ))}
            </Select>
          )}

          <Badge count={3} size="small" offset={[2, 2]}>
            <BellOutlined style={{ color: '#fff', fontSize: '18px', cursor: 'pointer' }} />
          </Badge>
          
          <Dropdown menu={{ items: userItems }} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Typography.Text style={{ color: '#fff' }}>
                {user?.email?.split('@')[0]}
              </Typography.Text>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      
      <Content style={{ 
        padding: '16px 20px', 
        background: isDark ? '#141414' : '#f0f2f5',
        minHeight: 'calc(100vh - 46px)',
      }}>
        {children}
      </Content>

      <style>{`
        .branch-select .ant-select-selection-item { color: white !important; font-weight: 500; }
        .branch-select .ant-select-arrow { color: rgba(255,255,255,0.7) !important; }
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>
    </Layout>
  );
};

export default MainLayout;