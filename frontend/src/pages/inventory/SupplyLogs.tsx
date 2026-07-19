import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Space, message, Input } from 'antd'; // Added Input to imports
import { PlusOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons'; // Added SearchOutlined
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext'; 
import LogSupplyModal from './LogSupplyModal';
import dayjs from 'dayjs';

const { Title } = Typography;

const SupplyLogs: React.FC = () => {
  const { user } = useAuth(); 
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState(''); // Added state to track search query

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getSupplyLogs();
      setLogs(res.data);
    } catch (e) {
      message.error("Failed to load delivery history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  // Filter logs locally based on search text matching Product Name or Vendor Name
  const filteredLogs = logs.filter((log: any) => {
    const searchLower = searchText.toLowerCase();
    return (
      (log.product_name && log.product_name.toLowerCase().includes(searchLower)) ||
      (log.vendor_name && log.vendor_name.toLowerCase().includes(searchLower)) ||
      (log.branch_name && log.branch_name.toLowerCase().includes(searchLower))
    );
  });

  const columns = [
    {
      title: 'Date Received',
      dataIndex: 'date_received',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name', 
      render: (name: string) => <Tag color="blue">{name || 'N/A'}</Tag>
    },
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Quantity',
      dataIndex: 'packs_received',
      render: (qty: number) => <strong>{qty} Packs</strong>,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
    },
    {
      title: 'Payment',
      dataIndex: 'is_paid_to_vendor',
      render: (paid: boolean) => (
        <Tag color={paid ? 'green' : 'volcano'}>
          {paid ? 'PAID' : 'UNPAID'}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space size="large" style={{ flex: 1 }}>
          <Space>
            <HistoryOutlined style={{ fontSize: '24px', color: '#714B67' }} />
            <Title level={3} style={{ margin: 0 }}>Vendor Deliveries</Title>
          </Space>
          {/* 🌟 ADDED: Smooth Search Bar Filter */}
          <Input
            placeholder="Search by product, vendor, or branch..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: '320px', borderRadius: '6px' }}
          />
        </Space>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setModalVisible(true)}
          style={{ background: '#714B67', border: 'none' }}
        >
          Log New Delivery
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table 
          dataSource={filteredLogs} // Updated from logs to filteredLogs
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <LogSupplyModal 
        visible={modalVisible}
        branchId={user?.role === 'ADMIN' ? "" : (user?.branch || "")}
        onCancel={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          fetchLogs();
        }}
      />
    </div>
  );
};

export default SupplyLogs;