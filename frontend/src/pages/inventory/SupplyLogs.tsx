import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Space, message } from 'antd';
import { PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext'; // Added Auth context
import LogSupplyModal from './LogSupplyModal';
import dayjs from 'dayjs';

const { Title } = Typography;

const SupplyLogs: React.FC = () => {
  const { user } = useAuth(); // Access logged-in user details
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // The backend get_queryset we updated earlier will 
      // automatically filter these logs for Managers.
      const res = await inventoryService.getSupplyLogs();
      setLogs(res.data);
    } catch (e) {
      message.error("Failed to load delivery history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const columns = [
    {
      title: 'Date Received',
      dataIndex: 'date_received',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name', // Ensure your serializer provides this
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <HistoryOutlined style={{ fontSize: '24px', color: '#714B67' }} />
          <Title level={3} style={{ margin: 0 }}>Vendor Deliveries</Title>
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
          dataSource={logs} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Passing the Branch Lock:
          If Admin: branchId is empty (Modal allows selection)
          If Manager: branchId is user.branch (Modal is locked)
      */}
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