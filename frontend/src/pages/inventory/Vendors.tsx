import React, { useEffect, useState } from 'react';
import { Table, Button, Typography, Card, Space, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Vendor } from '../../types/inventory';
import CreateVendorModal from './CreateVendorModal';

const { Title, Text } = Typography;

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { isDark } = useTheme();
  const navigate = useNavigate(); // Initialize the navigate function

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getVendors();
      setVendors(response.data);
    } catch (error) {
      message.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const columns = [
    { 
      title: 'Vendor Name', 
      dataIndex: 'name', 
      key: 'name', 
      render: (text: string, record: Vendor) => (
        /* Making the name clickable to go to the Detail View */
        <Button 
          type="link" 
          onClick={() => navigate(`/inventory/vendors/${record.id}`)} 
          style={{ padding: 0, fontWeight: 'bold' }}
        >
          {text}
        </Button>
      )
    },
    { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact' },
    {
      title: 'Action',
      key: 'action',
      render: (record: Vendor) => (
        /* View History button now directs to a filtered Supply Log view */
        <Button 
          type="link" 
          onClick={() => navigate(`/inventory/supply-logs?vendor=${record.id}`)}
        >
          View History
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0 }}>Vendors</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchVendors} />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#714B67', border: 'none', borderRadius: '4px' }}
          >
            Create
          </Button>
        </Space>
      </div>

      <Card 
        styles={{ body: { padding: '0' } }}
        style={{ 
          borderRadius: '8px', 
          overflow: 'hidden',
          background: isDark ? '#1f1f1f' : '#fff',
          border: isDark ? '1px solid #333' : '1px solid #f0f0f0' 
        }}
      >
        <Table 
          columns={columns} 
          dataSource={vendors} 
          loading={loading} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <CreateVendorModal 
        visible={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        onSuccess={() => { setIsModalVisible(false); fetchVendors(); }} 
      />
    </div>
  );
};

export default Vendors;