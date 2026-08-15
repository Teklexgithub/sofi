import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  LineChartOutlined,
  StockOutlined,
  TeamOutlined,
  DashboardOutlined
} from '@ant-design/icons';

// Sub-module visualization components
import { SalesAnalytics } from './components/SalesAnalytics';
import { InventoryAnalytics } from './components/InventoryAnalytics';
import { EmployeeAnalytics } from './components/EmployeeAnalytics';
import { useTheme } from '../../contexts/ThemeContext';
import { getChartTheme } from './shared/chartTheme';

const { Sider, Content } = Layout;
const { Title } = Typography;

export const DashboardHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('sales');
  const { isDark } = useTheme();
  const theme = getChartTheme(isDark);

  return (
    <Layout style={{
      background: theme.surface,
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Analytics section switcher */}
      <Sider
        width={240}
        theme={isDark ? 'dark' : 'light'}
        style={{
          borderRight: `1px solid ${theme.border}`,
          background: theme.surface,
          height: 'calc(100vh - 46px)',
          position: 'sticky',
          top: '46px',
        }}
      >
        <div style={{ padding: '24px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DashboardOutlined style={{ fontSize: '22px', color: '#714B67' }} />
          <Title level={4} style={{ margin: 0, color: '#714B67', fontWeight: 700 }}>Sofia Analytics</Title>
        </div>

        <Menu
          mode="inline"
          theme={isDark ? 'dark' : 'light'}
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key)}
          style={{ borderRight: 0, background: 'transparent' }}
          items={[
            {
              key: 'sales',
              icon: <LineChartOutlined style={{ fontSize: '16px' }} />,
              label: 'Sales',
            },
            {
              key: 'inventory',
              icon: <StockOutlined style={{ fontSize: '16px' }} />,
              label: 'Inventory',
            },
            {
              key: 'employee',
              icon: <TeamOutlined style={{ fontSize: '16px' }} />,
              label: 'Employees',
            },
          ]}
        />
      </Sider>

      {/* Main visualization canvas for whichever section is selected */}
      <Content style={{
        padding: '24px',
        background: theme.pagePlane,
      }}>
        {activeTab === 'sales' && <SalesAnalytics />}
        {activeTab === 'inventory' && <InventoryAnalytics />}
        {activeTab === 'employee' && <EmployeeAnalytics />}
      </Content>
    </Layout>
  );
};

export default DashboardHub;
