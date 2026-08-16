import React, { useEffect, useState } from 'react';
import { Table, Button, Typography, Card, Space, Input, message } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Vendor } from '../../types/inventory';
import CreateVendorModal from './CreateVendorModal';

const { Title, Text } = Typography;

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();
  const navigate = useNavigate(); // Initialize the navigate function
  const { t } = useTranslation('inventory');

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getVendors();
      setVendors(response.data);
    } catch (error) {
      message.error(t('vendors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase();
    return v.name?.toLowerCase().includes(q) || v.contact_person?.toLowerCase().includes(q);
  });

  const columns = [
    {
      title: t('vendors.columns.name'),
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
    { title: t('common:fields.contactPerson'), dataIndex: 'contact_person', key: 'contact' },
    {
      title: t('common:fields.action'),
      key: 'action',
      render: (record: Vendor) => (
        /* View History button now directs to a filtered Supply Log view */
        <Button
          type="link"
          onClick={() => navigate(`/inventory/supply-logs?vendor=${record.id}`)}
        >
          {t('vendors.viewHistory')}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <Title level={3} style={{ margin: 0 }}>{t('vendors.title')}</Title>
        <Space>
          <Input
            placeholder={t('vendors.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '280px' }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchVendors} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#714B67', border: 'none', borderRadius: '4px' }}
          >
            {t('common:actions.create')}
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
          dataSource={filteredVendors}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
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