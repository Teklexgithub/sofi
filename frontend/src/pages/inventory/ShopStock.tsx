import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Space, Button, Input, message } from 'antd';
import { ReloadOutlined, ShopOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';

const { Title, Text } = Typography;

/** * Interface for ShopStock items matching the Serializer fields
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

  const fetchShopStock = async () => {
    setLoading(true);
    try {
      // Calls the updated service using inventoryApi
      const res = await inventoryService.getShopStock(); 
      setData(res.data);
    } catch (e) {
      message.error("Failed to load shop stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopStock();
  }, []);

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product',
      render: (text: string, record: ShopStockItem) => (
        <Button 
          type="link" 
          // Redirects to the detail page using the record ID
          onClick={() => navigate(`/inventory/shop/${record.id}`)} 
          style={{ padding: 0, fontWeight: 'bold', color: '#714B67' }}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Quantity (Pieces)',
      dataIndex: 'quantity_in_pieces',
      key: 'qty',
      render: (qty: number) => (
        <Tag color={qty < 20 ? 'red' : 'blue'} style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {qty} Pieces
        </Tag>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: ShopStockItem) => (
        record.quantity_in_pieces > 0 ? 
          <Tag color="success">In Stock</Tag> : 
          <Tag color="error">Out of Stock</Tag>
      )
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Space size="middle">
          <Title level={3} style={{ margin: 0 }}>
            <ShopOutlined /> Shop Stock (Pieces)
          </Title>
        </Space>
        
        <Space>
          <Input 
            placeholder="Search pieces..." 
            prefix={<SearchOutlined />} 
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchShopStock} />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            style={{ background: '#714B67', border: 'none' }}
            onClick={() => message.info("Opening manual adjustment...")}
          >
            Adjust Pieces
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
    </div>
  );
};

export default ShopStock;