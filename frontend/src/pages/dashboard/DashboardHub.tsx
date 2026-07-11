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

const { Sider, Content } = Layout;
const { Title } = Typography;

export const DashboardHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('sales');

  return (
    <Layout style={{ 
      height: 'calc(100vh - 80px)', // Binds container context explicitly within screen boundaries
      background: '#ffffff', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      overflow: 'hidden' // Locks outer component frame layout stable
    }}>
      {/* Odoo-style Analytics Control Sidebar Panel */}
      <Sider 
        width={240} 
        theme="light" 
        style={{ 
          borderRight: '1px solid #f0f0f0', 
          background: '#ffffff',
          height: '100%'
        }}
      >
        <div style={{ padding: '24px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DashboardOutlined style={{ fontSize: '22px', color: '#714B67' }} />
          <Title level={4} style={{ margin: 0, color: '#714B67', fontWeight: 700 }}>Sofia Analytics</Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key)}
          style={{ borderRight: 0 }}
          items={[
            { 
              key: 'sales', 
              icon: <LineChartOutlined style={{ fontSize: '16px' }} />, 
              label: 'Sales & Revenue Panel',
              style: activeTab === 'sales' ? { backgroundColor: '#714B67', color: '#fff' } : {}
            },
            { 
              key: 'inventory', 
              icon: <StockOutlined style={{ fontSize: '16px' }} />, 
              label: 'Inventory Assets Desk',
              style: activeTab === 'inventory' ? { backgroundColor: '#714B67', color: '#fff' } : {}
            },
            { 
              key: 'employee', 
              icon: <TeamOutlined style={{ fontSize: '16px' }} />, 
              label: 'Workforce & Payroll Matrix',
              style: activeTab === 'employee' ? { backgroundColor: '#714B67', color: '#fff' } : {}
            },
          ]}
        />
      </Sider>

      {/* Main Metric Visualization Work Desk Canvas */}
      {/* 🌟 FIXED: Created an isolated scroll context panel context */}
      <Content style={{ 
        padding: '24px', 
        background: '#fafafa',
        height: '100%',
        overflowY: 'auto' // Activates clean internal element scrolling engine!
      }}>
        {activeTab === 'sales' && <SalesAnalytics />}
        {activeTab === 'inventory' && <InventoryAnalytics />}
        {activeTab === 'employee' && <EmployeeAnalytics />}
      </Content>
    </Layout>
  );
};

export default DashboardHub;