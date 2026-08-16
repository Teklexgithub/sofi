import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Button, message, Tag, Input, Space } from 'antd'; // Added Input and Space to imports
import { PlusOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons'; // Added SearchOutlined
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import InternalTransferModal from './InternalTransferModal';

const { Title } = Typography;

const InternalTransfers: React.FC = () => {
  const { isAdmin } = useAuth();
  const { selectedBranch } = useBranch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState(''); // Added state to track search query
  const { t } = useTranslation('inventory');

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getInternalTransfers();
      setData(res.data);
    } catch (e) {
      message.error(t('internalTransfers.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, []);

  // Filter logs locally based on search text matching Product Name or Branch Name
  const filteredData = data.filter((item: any) => {
    const searchLower = searchText.toLowerCase();
    return (
      (item.product_name && item.product_name.toLowerCase().includes(searchLower)) ||
      (item.branch_name && item.branch_name.toLowerCase().includes(searchLower))
    );
  });

  const columns = [
    { title: t('common:fields.date'), dataIndex: 'timestamp', key: 'date', render: (d: string) => new Date(d).toLocaleString() },
    { title: t('common:fields.branch'), dataIndex: 'branch_name', key: 'branch', render: (name: string) => <Tag color="purple">{name}</Tag> },
    { title: t('common:fields.product'), dataIndex: 'product_name', key: 'product' },
    { title: t('internalTransfers.columns.packsRemoved'), dataIndex: 'packs_moved', key: 'packs' },
    { title: t('internalTransfers.columns.piecesAdded'), dataIndex: 'pieces_created', key: 'pieces' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Space size="large" style={{ flex: 1 }}>
          <Title level={3} style={{ margin: 0 }}><HistoryOutlined /> {t('internalTransfers.title')}</Title>
          {/* 🌟 ADDED: Smooth Search Bar Filter */}
          <Input
            placeholder={t('internalTransfers.searchPlaceholder')}
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
          style={{ background: '#714B67', border: 'none' }}
          onClick={() => setIsModalVisible(true)}
        >
          {t('internalTransfers.newRefill')}
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={filteredData} // Updated from data to filteredData
          columns={columns}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
        />
      </Card>

    <InternalTransferModal 
      visible={isModalVisible} 
      branchId={isAdmin ? "" : (selectedBranch || "")}
      onCancel={() => setIsModalVisible(false)} 
      onSuccess={() => { setIsModalVisible(false); fetchTransfers(); }} 
    />
    </div>
  );
};

export default InternalTransfers;