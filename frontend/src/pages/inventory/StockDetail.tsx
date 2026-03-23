import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Typography, Breadcrumb, message, Spin } from 'antd';
import { EditOutlined, HistoryOutlined, ShopOutlined, InboxOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';

const { Title, Text } = Typography;

interface StockDetailProps {
  type: 'store' | 'shop';
}

const StockDetail: React.FC<StockDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // FIXED: Use the direct detail methods from the updated service
        const res = type === 'store' 
          ? await inventoryService.getStoreStockDetail(id) 
          : await inventoryService.getShopStockDetail(id);
        
        setData(res.data);
      } catch (e) {
        console.error(e);
        message.error("Failed to load stock details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, type]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  if (!data) return <div style={{ padding: '50px', textAlign: 'center' }}><Text type="danger">Stock record not found.</Text></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span 
            onClick={() => navigate(type === 'store' ? '/inventory/store' : '/inventory/shop')} 
            style={{ cursor: 'pointer', color: '#714B67', fontWeight: '500' }}
          >
            {type === 'store' ? 'Store Stock' : 'Shop Stock'}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{data.product_name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>
            {type === 'store' ? <InboxOutlined style={{ marginRight: 8, color: '#714B67' }} /> : <ShopOutlined style={{ marginRight: 8, color: '#714B67' }} />}
            {data.product_name}
          </Title>
          <Text type="secondary">Detailed inventory status for this product</Text>
        </Space>
        
        <Space>
          <Button icon={<HistoryOutlined />}>Movement Logs</Button>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            style={{ background: '#714B67', border: 'none' }}
            onClick={() => message.info("Opening manual adjustment modal...")}
          >
            Adjust {type === 'store' ? 'Packs' : 'Pieces'}
          </Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
          <Descriptions title="Current Levels" column={1} bordered>
            <Descriptions.Item label="Quantity">
              <Text strong style={{ fontSize: '20px', color: '#714B67' }}>
                {type === 'store' ? `${data.quantity_in_packs} Packs` : `${data.quantity_in_pieces} Pieces`}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={(type === 'store' ? data.quantity_in_packs : data.quantity_in_pieces) > 0 ? 'green' : 'red'}>
                {(type === 'store' ? data.quantity_in_packs : data.quantity_in_pieces) > 0 ? 'In Stock' : 'Out of Stock'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
          <Descriptions title="Location Info" column={1} bordered>
            <Descriptions.Item label="Branch">
               {/* Safe split logic for UUIDs */}
               <Tag color="blue">Branch: {data.branch_name ? String(data.branch_name).split('-')[0] : 'Global'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Storage Zone">
               {type === 'store' ? 'Warehouse / Bulk' : 'Retail Shelf'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </div>
  );
};

export default StockDetail;