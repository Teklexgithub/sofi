import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, Card, Input, message } from 'antd';
import { PlusOutlined, ReloadOutlined, ShopOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Branch } from '../../types/settings';
import CreateBranchModal from './CreateBranchModal';

const { Title } = Typography;

const Branches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getBranches();
      setBranches(response.data);
    } catch (error) {
      message.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  const filteredBranches = branches.filter(b => {
    const q = searchQuery.toLowerCase();
    return b.name?.toLowerCase().includes(q) || b.location?.toLowerCase().includes(q);
  });

  const columns = [
    { 
      title: 'Branch Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (text: string, record: Branch) => (
        <Space>
          <ShopOutlined style={{ color: '#714B67' }} />
          <Button 
            type="link" 
            onClick={() => navigate(`/settings/branches/${record.id}`)} 
            style={{ padding: 0, fontWeight: 'bold' }}
          >
            {text}
          </Button>
        </Space>
      )
    },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Branch) => (
        <Button type="link" onClick={() => navigate(`/settings/branches/${record.id}`)}>Manage</Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <Title level={3} style={{ margin: 0 }}>Branches</Title>
        <Space>
          <Input
            placeholder="Search by branch or location..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '260px' }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchBranches} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#714B67', border: 'none' }}
          >
            Create Branch
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: '0' } }} style={{
        borderRadius: '8px',
        background: isDark ? '#1f1f1f' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #f0f0f0',
        overflow: 'hidden'
      }}>
        <Table columns={columns} dataSource={filteredBranches} loading={loading} rowKey="id" scroll={{ x: 'max-content' }} />
      </Card>

      <CreateBranchModal 
        visible={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        onSuccess={() => { setIsModalVisible(false); fetchBranches(); }} 
      />
    </div>
  );
};

export default Branches;