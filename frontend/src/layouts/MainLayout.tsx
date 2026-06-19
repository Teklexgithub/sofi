import React, { useState, useEffect } from 'react';
import { Layout, Avatar, Dropdown, Badge, Space, Typography, Switch, Menu, Select } from 'antd';
import type { MenuProps } from 'antd';
import { 
  BellOutlined, UserOutlined, LogoutOutlined, 
  AppstoreOutlined, EnvironmentOutlined, ShopOutlined,
  FileTextOutlined, TeamOutlined, 
  // LineChartOutlined, 
  SettingOutlined, DollarOutlined, HistoryOutlined,
  WalletOutlined, BankOutlined 
} from '@ant-design/icons';
import { useAuth, api } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const { Header, Content, Sider } = Layout;

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
        const res = await api.get('inventory/branches/');
        setBranches(res.data);
        if (res.data.length > 0) setSelectedBranch(res.data[0].id);
      } catch (e) { 
        console.error("Failed to load branches"); 
      }
    };
    fetchBranches();
  }, []);

  // Define your master apps list for the sidebar switcher
  const allApps = [
    { name: 'Inventory', icon: <ShopOutlined />, color: '#008784', path: '/inventory/products' },
    { name: 'Sales', icon: <FileTextOutlined />, color: '#875A7B', path: '/sales/daily-session' },
    { name: 'Employee', icon: <TeamOutlined />, color: '#E46651', path: '/employees' },
    // { name: 'Reporting', icon: <LineChartOutlined />, color: '#21B799', path: '/reporting' },
    { name: 'Dashboard', icon: <AppstoreOutlined />, color: '#1f74ac', path: '/' },
    { 
      name: 'Settings', 
      icon: <SettingOutlined />, 
      color: '#4A5B6D', 
      path: '/settings/users', 
      adminOnly: true 
    },
  ];

  // Filter apps based on user role
  const visibleApps = allApps.filter(app => {
    if (app.adminOnly) {
      return user?.role === 'ADMIN';
    }
    return true;
  });

  const isHomeDashboard = location.pathname === '/';
  const isInventoryModule = location.pathname.startsWith('/inventory');
  const isSalesModule = location.pathname.startsWith('/sales'); // ADDED THIS
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

  // NEW: Navigation Items for Sales (Matches Inventory Format Exactly)
  const salesItems: MenuProps['items'] = [
  {
    key: 'daily_sessions_nav',
    label: 'Daily Sessions',
    children: [
      { key: '/sales/daily-session', label: 'Daily Worksheet', icon: <DollarOutlined />, onClick: () => navigate('/sales/daily-session') },
      { key: '/sales/history', label: 'Sales History', icon: <HistoryOutlined />, onClick: () => navigate('/sales/history') },
    ]
  },
  {
      key: '/sales/settlements',
      label: 'Vendor Settlements',
      icon: <WalletOutlined />,
      onClick: () => navigate('/sales/settlements', { state: { targetTab: '1' } })
  },
  // --- CONDITIONAL ADMIN-ONLY DIGITAL MANAGEMENT SYSTEM SUBMENU ---
  ...(user?.role === 'ADMIN' ? [{
    key: 'digital_management_nav',
    label: 'Digital Accounts',
    icon: <BankOutlined />, // Moved the main folder icon here for a professional look
    children: [
      { 
        key: '/sales/digital-accounts-setup', 
        label: 'Bank Accounts', 
        onClick: () => navigate('/sales/digital-accounts-setup') 
      },
      { 
        key: '/sales/digital-adjustments', 
        label: 'Journal Adjustments', 
        onClick: () => navigate('/sales/digital-adjustments') // Added missing redirect listener!
      },

      { 
        key: '/sales/shortages-ledger', 
        label: 'Shortages Ledger', 
        onClick: () => navigate('/sales/shortages-ledger') 
      }
    ]
  }] : []),
  
  
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

  // User Dropdown Menu
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

  // Dynamic Title Helper
  const getHeaderTitle = () => {
    if (isInventoryModule) return 'Inventory';
    if (isSalesModule) return 'Sales';
    if (isSettingsModule) return 'Settings';
    return 'Sofia ERP';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* GLOBAL TOP HEADER */}
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
            {getHeaderTitle()}
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
          {isSalesModule && (
            <Menu 
              mode="horizontal" 
              theme="dark" 
              items={salesItems} 
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
          {(isInventoryModule || isSettingsModule || isSalesModule) && (
            <Select
              size="small"
              value={selectedBranch}
              onChange={setSelectedBranch}
              suffixIcon={<EnvironmentOutlined style={{ color: 'rgba(255,255,255,0.7)' }} />}
              style={{ width: 160 }}
              variant="borderless"
              dropdownStyle={{ zIndex: 1100 }}
              className="branch-select"
              disabled={user?.role !== 'ADMIN'}
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
      
      {/* MIDDLE CONTAINER HOUSING SIDEBAR AND CONTENT */}
      <Layout style={{ flexDirection: 'row' }}>
        
        {/* ODOO-STYLE COMPACT SIDEBAR WITH TEXT LABELS */}
        {!isHomeDashboard && (
          <Sider
            theme={isDark ? 'dark' : 'light'}
            width={76}
            collapsed={true}
            collapsedWidth={76}
            style={{
              borderRight: isDark ? '1px solid #303030' : '1px solid #e8e8e8',
              background: isDark ? '#141414' : '#fcfcfc',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
              height: 'calc(100vh - 46px)',
              position: 'sticky',
              top: '46px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
              {visibleApps.map((app) => {
                const baseRoute = app.path.split('/')[1];
                const isActive = baseRoute === '' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(`/${baseRoute}`);

                return (
                  <div
                    key={app.path}
                    onClick={() => navigate(app.path)}
                    style={{
                      width: '64px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: '6px 0',
                      borderRadius: '8px'
                    }}
                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? app.color : (isDark ? '#262626' : '#f0f0f0'),
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '20px',
                        color: isActive ? '#fff' : app.color,
                        boxShadow: isActive ? '0 4px 8px rgba(0,0,0,0.15)' : 'none',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {app.icon}
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 500,
                        marginTop: '4px',
                        textAlign: 'center',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isActive 
                          ? (isDark ? '#fff' : '#000') 
                          : (isDark ? '#a6a6a6' : '#595959')
                      }}
                    >
                      {app.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </Sider>
        )}

        <Content style={{ 
          padding: '16px 20px', 
          background: isDark ? '#141414' : '#f0f2f5',
          minHeight: 'calc(100vh - 46px)',
          width: '100%',
          overflowY: 'auto'
        }}>
          {children}
        </Content>
      </Layout>

      <style>{`
        .branch-select .ant-select-selection-item { color: white !important; font-weight: 500; }
        .branch-select .ant-select-arrow { color: rgba(255,255,255,0.7) !important; }
        .ant-menu-dark.ant-menu-horizontal > .ant-menu-item:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>
    </Layout>
  );
};

export default MainLayout;