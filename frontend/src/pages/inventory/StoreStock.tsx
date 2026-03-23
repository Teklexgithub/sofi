import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Space, Button, Input, message } from 'antd';
import { ReloadOutlined, SearchOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import LogSupplyModal from './LogSupplyModal'; // Import the new modal

const { Title } = Typography;

interface StoreStockItem {
  id: string;
  product_name: string;
  quantity_in_packs: number;
  branch: string;
}

const StoreStock: React.FC = () => {
  const [data, setData] = useState<StoreStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal state
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Assuming you'll eventually get this from the MainLayout Branch Switcher
  const currentBranchId = data[0]?.branch || ""; 

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getStoreStock();
      setData(res.data);
    } catch (e) {
      message.error("Failed to sync store stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStock(); }, []);

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product',
      render: (text: string, record: StoreStockItem) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/inventory/store/${record.id}`)}
          style={{ padding: 0, fontWeight: 'bold', color: '#714B67' }}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name', 
      key: 'branch',
      render: (id: string) => <Tag color="default">{id ? id.split('-')[0] : 'N/A'}...</Tag>
    },
    {
      title: 'Quantity (Packs)',
      dataIndex: 'quantity_in_packs',
      key: 'qty',
      render: (qty: number) => (
        <Tag color={qty < 10 ? 'orange' : 'green'} style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {qty} Packs
        </Tag>
      )
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={3} style={{ margin: 0 }}>
          <InboxOutlined /> Store Stock (Bulk)
        </Title>
        <Space>
          <Input 
            placeholder="Search products..." 
            prefix={<SearchOutlined />} 
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchStock} />
          
          {/* UPDATED BUTTON: Opens the LogSupplyModal */}
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            style={{ background: '#714B67', border: 'none' }}
            onClick={() => setIsModalVisible(true)}
          >
            Add Stock
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: '0' } }} style={{ 
        borderRadius: '8px', 
        background: isDark ? '#1f1f1f' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #f0f0f0',
        overflow: 'hidden'
      }}>
        <Table 
          dataSource={data.filter(item => 
            item.product_name.toLowerCase().includes(searchText.toLowerCase())
          )} 
          columns={columns} 
          loading={loading} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL IMPLEMENTATION */}
      <LogSupplyModal 
        visible={isModalVisible}
        branchId={currentBranchId}
        onCancel={() => setIsModalVisible(false)}
        onSuccess={() => {
          setIsModalVisible(false);
          fetchStock(); // Refresh list after adding stock
        }}
      />
    </div>
  );
};

export default StoreStock;