import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Button, message, Tag } from 'antd';
import { PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext'; // Added Auth to check role
import InternalTransferModal from './InternalTransferModal';

const { Title } = Typography;

const InternalTransfers: React.FC = () => {
  const { user } = useAuth(); // Get logged in user info
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      // The backend get_queryset now automatically filters by user branch
      const res = await inventoryService.getInternalTransfers();
      setData(res.data);
    } catch (e) {
      message.error("Failed to load transfer history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, []);

  const columns = [
    { title: 'Date', dataIndex: 'timestamp', key: 'date', render: (d: string) => new Date(d).toLocaleString() },
    { title: 'Branch', dataIndex: 'branch_name', key: 'branch', render: (name: string) => <Tag color="purple">{name}</Tag> },
    { title: 'Product', dataIndex: 'product_name', key: 'product' },
    { title: 'Packs Removed', dataIndex: 'packs_moved', key: 'packs' },
    { title: 'Pieces Added', dataIndex: 'pieces_created', key: 'pieces' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={3} style={{ margin: 0 }}><HistoryOutlined /> Store to Shop Refills</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          style={{ background: '#714B67', border: 'none' }}
          onClick={() => setIsModalVisible(true)}
        >
          New Refill
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table dataSource={data} columns={columns} loading={loading} rowKey="id" />
      </Card>

      {/* PASSING USER BRANCH ID: 
          If manager, we pass their branchId. 
          If admin, we pass empty string so they can choose.
      */}
    <InternalTransferModal 
      visible={isModalVisible} 
      // If branch is already a string ID, use it directly. 
      // If it's an object, use .id. Based on your error, it's a string.
      branchId={user?.role === 'ADMIN' ? "" : (user?.branch || "")} 
      onCancel={() => setIsModalVisible(false)} 
      onSuccess={() => { setIsModalVisible(false); fetchTransfers(); }} 
    />
    </div>
  );
};

export default InternalTransfers;