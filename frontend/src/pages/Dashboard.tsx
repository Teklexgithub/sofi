import React from 'react';
import { Row, Col, Typography } from 'antd';
import { 
  ShopOutlined, FileTextOutlined, TeamOutlined,
  LineChartOutlined, AppstoreOutlined, SettingOutlined 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth to check roles

const { Text } = Typography;

const Dashboard: React.FC = () => {
  const { isDark } = useTheme();
  const { user } = useAuth(); // Access the current user object

  // Define all possible apps based on your updated list
  const allApps = [
    { name: 'Inventory', icon: <ShopOutlined />, color: '#008784', path: '/inventory/products' },
    { name: 'Sales', icon: <FileTextOutlined />, color: '#875A7B', path: '/sales' },
    { name: 'Employee', icon: <TeamOutlined />, color: '#E46651', path: '/employees' },
    { name: 'Reporting', icon: <LineChartOutlined />, color: '#21B799', path: '/reporting' },
    { name: 'Dashboard', icon: <AppstoreOutlined />, color: '#1f74ac', path: '/analytics' },
    { 
      name: 'Settings', 
      icon: <SettingOutlined />, 
      color: '#4A5B6D', // Matches your Settings Blue
      path: '/settings/users', // Landing on users list as default
      adminOnly: true // Flag for filtering
    },
  ];

  // Filter apps based on user role
  const visibleApps = allApps.filter(app => {
    if (app.adminOnly) {
      return user?.role === 'ADMIN'; // Only allow if user is Admin
    }
    return true; // Other apps are visible to everyone
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        <Row gutter={[16, 32]} justify="start">
          {visibleApps.map((app, index) => (
            <Col span={4} key={index} style={{ textAlign: 'center' }}>
              <Link to={app.path}>
                <div 
                  className="odoo-app-icon"
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    transition: 'transform 0.2s' 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{
                    width: '70px',
                    height: '70px',
                    backgroundColor: isDark ? '#2a2a2a' : '#fff',
                    borderRadius: '18px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '35px',
                    color: app.color,
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.05)',
                    marginBottom: '8px',
                    border: isDark ? '1px solid #444' : 'none',
                  }}>
                    {app.icon}
                  </div>
                  <Text style={{ 
                    color: isDark ? '#e0e0e0' : '#4c4c4c', 
                    fontSize: '13px', 
                    fontWeight: 500 
                  }}>
                    {app.name}
                  </Text>
                </div>
              </Link>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;