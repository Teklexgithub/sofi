import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Space, Button, Input, message } from 'antd';
import { 
  ReloadOutlined, 
  SearchOutlined, 
  ShopOutlined, 
  ArrowUpOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';

const { Title } = Typography;

/**
 * Interface matching your ShopStock Model
 */
interface ShopStockItem {
  id: string;
  product_name: string;
  quantity_in_pieces: number;
  branch: string;
}

const ShopStock: React.FC = () => {
  const [data, setData] = useState<ShopStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Fetches data from the /shop-stock/ endpoint
      const res = await inventoryService.getShopStock();
      setData(res.data);
    } catch (e) {
      message.error("Failed to sync shop inventory levels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product',
      render: (text: string, record: ShopStockItem) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/inventory/shop/${record.id}`)}
          style={{ padding: 0, fontWeight: 'bold', color: '#714B67' }}
        >
          {text}
        </Button>
      )
    },
    {
    title: 'Branch',
    dataIndex: 'branch_name', // Ensure your ShopStockSerializer includes branch_name
    key: 'branch',
    render: (name: string) => <Tag color="blue">{name}</Tag>
    },
    {
      title: 'Current Pieces',
      dataIndex: 'quantity_in_pieces',
      key: 'qty',
      render: (qty: number) => {
        // Visual indicator for low stock at retail level
        let color = 'green';
        if (qty <= 5) color = 'red';
        else if (qty <= 15) color = 'orange';
        
        return (
          <Tag color={color} style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {qty} Pieces
          </Tag>
        );
      }
    },
    {
      title: 'Replenishment Status',
      key: 'status',
      render: (_: any, record: ShopStockItem) => (
        record.quantity_in_pieces <= 15 ? (
          <Tag icon={<ArrowUpOutlined />} color="warning">
            NEEDS REFILL
          </Tag>
        ) : (
          <Tag color="success">STOCKED</Tag>
        )
      )
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <Title level={3} style={{ margin: 0 }}>
          <ShopOutlined /> Shop Stock (Pieces)
        </Title>
        <Space>
          <Input 
            placeholder="Search shop items..." 
            prefix={<SearchOutlined />} 
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchStock} />
          {/* Internal Transfer Shortcut */}
          <Button 
            type="primary" 
            style={{ background: '#714B67', border: 'none' }}
            onClick={() => navigate('/inventory/transfers')}
          >
            Refill from Store
          </Button>
        </Space>
      </div>

      {/* Table Section */}
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

      <p style={{ marginTop: '16px', color: '#888', fontSize: '12px' }}>
        * Shop Stock shows individual units available for customer sales. 
        Levels are replenished from the Store (Bulk) using <b>Internal Transfers</b>.
      </p>
    </div>
  );
};

export default ShopStock;