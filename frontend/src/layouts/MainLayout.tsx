import React from 'react';
import { Layout, Avatar, Dropdown, Badge, Space, Typography, Switch, Menu, Select, Segmented } from 'antd';
import type { MenuProps } from 'antd';
import {
  BellOutlined, UserOutlined, LogoutOutlined,
  AppstoreOutlined, EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined, HistoryOutlined,
  WalletOutlined, BankOutlined, FormOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useVisibleApps } from '../config/navApps';
import { useLocation, useNavigate, Link } from 'react-router-dom';


const { Header, Content, Sider } = Layout;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation('nav');
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const { assignedBranches, selectedBranch, setSelectedBranch } = useBranch();
  const visibleApps = useVisibleApps();

  const isHomeDashboard = location.pathname === '/';
  const isInventoryModule = location.pathname.startsWith('/inventory');
  const isSalesModule = location.pathname.startsWith('/sales'); 
  const isEmployeeModule = location.pathname.startsWith('/employees'); 
  const isSettingsModule = location.pathname.startsWith('/settings');
  const isAnalyticsModule = location.pathname.startsWith('/analytics');

  // Navigation Items for Inventory
  const inventoryItems: MenuProps['items'] = [
    {
      key: 'overview',
      label: t('inventory.stockLevels'),
      children: [
        { key: '/inventory/store', label: t('inventory.storeStock'), onClick: () => navigate('/inventory/store') },
        { key: '/inventory/shop', label: t('inventory.shopStock'), onClick: () => navigate('/inventory/shop') },
      ]
    },
    // --- CONDITIONAL ADMIN-ONLY MASTER DATA SUBMENU ---
    ...(isAdmin ? [{
      key: 'products_nav',
      label: t('inventory.masterData'),
      children: [
        { key: '/inventory/products', label: t('inventory.products'), onClick: () => navigate('/inventory/products') },
        { key: '/inventory/vendors', label: t('inventory.vendors'), onClick: () => navigate('/inventory/vendors') },
      ]
    }] : []),
    {
      key: 'operations',
      label: t('inventory.operations'),
      children: [
        { key: '/inventory/supply-logs', label: t('inventory.vendorDeliveries'), onClick: () => navigate('/inventory/supply-logs') },
        { key: '/inventory/transfers', label: t('inventory.storeToShopRefills'), onClick: () => navigate('/inventory/transfers') },
      ]
    },
  ];

  // NEW: Navigation Items for Sales (Matches Inventory Format Exactly)
  const salesItems: MenuProps['items'] = [
    {
      key: 'daily_sessions_nav',
      label: t('sales.dailySessions'),
      children: [
        { key: '/sales/daily-session', label: t('sales.dailyWorksheet'), icon: <DollarOutlined />, onClick: () => navigate('/sales/daily-session') },
        { key: '/sales/history', label: t('sales.salesHistory'), icon: <HistoryOutlined />, onClick: () => navigate('/sales/history') },
      ]
    },
    // --- CONDITIONAL ADMIN-ONLY VENDOR PAYMENTS & DIGITAL MANAGEMENT SUBMENUS ---
    ...(isAdmin ? [
      {
        key: '/sales/settlements',
        label: t('sales.vendorSettlements'),
        icon: <WalletOutlined />,
        onClick: () => navigate('/sales/settlements', { state: { targetTab: '1' } })
      },
      {
        key: 'digital_management_nav',
        label: t('sales.digitalAccounts'),
        icon: <BankOutlined />, // Moved the main folder icon here for a professional look
        children: [
          {
            key: '/sales/digital-accounts-setup',
            label: t('sales.bankAccounts'),
            onClick: () => navigate('/sales/digital-accounts-setup')
          },
          {
            key: '/sales/digital-adjustments',
            label: t('sales.journalAdjustments'),
            onClick: () => navigate('/sales/digital-adjustments') // Added missing redirect listener!
          },
          {
            key: '/sales/shortages-ledger',
            label: t('sales.shortagesLedger'),
            onClick: () => navigate('/sales/shortages-ledger')
          }
        ]
      }
    ] : []),
  ];

  // 🌟 ADDED: Navigation Items for Employee App (Horizontal sub-menu layout configuration matching structural standard format)
  const employeeItems: MenuProps['items'] = [
    {
      key: '/employees',
      label: t('employee.employees'),
      icon: <TeamOutlined />,
      onClick: () => navigate('/employees')
    },
    {
      key: 'advances_fines_nav',
      label: t('employee.advancesFines'),
      icon: <WalletOutlined />,
      children: [
        { key: '/employees?tab=advance_reg', label: t('employee.issueAdvanceFine'), icon: <FormOutlined />, onClick: () => navigate('/employees?tab=advance_reg') },
        { key: '/employees?tab=advance_history', label: t('employee.ledgerHistory'), icon: <HistoryOutlined />, onClick: () => navigate('/employees?tab=advance_history') },
      ]
    },
    {
      key: 'payslips_nav',
      label: t('employee.payslipsRun'),
      icon: <DollarOutlined />,
      children: [
        { key: '/employees?tab=payslip_run', label: t('employee.executePayout'), icon: <FormOutlined />, onClick: () => navigate('/employees?tab=payslip_run') },
        { key: '/employees?tab=payslip_history', label: t('employee.payslipHistory'), icon: <HistoryOutlined />, onClick: () => navigate('/employees?tab=payslip_history') },
      ]
    }
  ];

  // Navigation Items for Settings
  const settingsItems: MenuProps['items'] = [
    {
      key: 'configuration',
      label: t('settings.configuration'),
      children: [
        { key: '/settings/users', label: t('settings.users'), onClick: () => navigate('/settings/users') },
        { key: '/settings/branches', label: t('settings.branches'), onClick: () => navigate('/settings/branches') },
      ]
    }
  ];

  // User Dropdown Menu
  const userItems: MenuProps['items'] = [
    { key: 'profile', label: 'Sofia Organic', icon: <UserOutlined /> },
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
          <span>{t('user.darkMode')}</span>
          <Switch
            size="small"
            checked={isDark}
            onChange={toggleTheme}
          />
        </div>
      )
    },
    {
      key: 'language-toggle',
      label: (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          minWidth: '130px',
          gap: '10px'
        }}>
          <span>{t('user.language')}</span>
          <Segmented
            size="small"
            value={language}
            onChange={(val) => setLanguage(val as 'en' | 'am')}
            options={[{ label: 'EN', value: 'en' }, { label: 'አማ', value: 'am' }]}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: t('user.logout'),
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
    if (isInventoryModule) return t('headerTitle.inventory');
    if (isSalesModule) return t('headerTitle.sales');
    if (isEmployeeModule) return t('headerTitle.employee');
    if (isSettingsModule) return t('headerTitle.settings');
    if (isAnalyticsModule) return t('headerTitle.analytics');
    return t('headerTitle.default');
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
          {/* 🌟 ADDED: Horizontal Employee Navbar Mount */}
          {isEmployeeModule && (
            <Menu 
              mode="horizontal" 
              theme="dark" 
              items={employeeItems} 
              selectedKeys={[location.pathname + location.search]}
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
          {/* 🌟 FIXED: Added isEmployeeModule condition check to include branch select options */}
          {(isInventoryModule || isSettingsModule || isSalesModule || isEmployeeModule || isAnalyticsModule) && (
            <Select
              size="small"
              value={selectedBranch}
              onChange={setSelectedBranch}
              suffixIcon={<EnvironmentOutlined style={{ color: 'rgba(255,255,255,0.7)' }} />}
              style={{ width: 160 }}
              variant="borderless"
              dropdownStyle={{ zIndex: 1100 }}
              className="branch-select"
              disabled={assignedBranches.length <= 1}
            >
              {assignedBranches.map(b => (
                <Select.Option key={b.id} value={b.id}>
                  <span style={{ color: isDark ? '#fff' : '#000' }}>{b.name}</span>
                </Select.Option>
              ))}
            </Select>
          )}

          {/* <Badge count={3} size="small" offset={[2, 2]}>
            <BellOutlined style={{ color: '#fff', fontSize: '18px', cursor: 'pointer' }} />
          </Badge> */}
          
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
          width: '100%'
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