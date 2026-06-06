import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, BarChartOutlined, ShopOutlined, DatabaseOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
// Removed unused Product import to fix "value is never read" error
import CreateProductModal from './CreateProductModal';

const { Title, Text } = Typography;

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getProductDetail(id!);
      setProduct(response.data);
    } catch (error) {
      message.error("Could not load product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    try {
      await inventoryService.deleteProduct(id!);
      message.success("Product deleted successfully");
      navigate('/inventory/products');
    } catch (error) {
      message.error("Failed to delete product");
    }
  };

  // Fixed the 'danger' prop error here by using type="danger"
  if (!product && !loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <Text type="danger">Product not found</Text> 
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/inventory/products')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            Products
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{product?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{product?.name}</Title>
          <Space style={{ marginTop: 8 }}>
            <Tag color="purple">{product?.category_display}</Tag>
            <Tag 
              icon={product?.destination === 'SHOP' ? <ShopOutlined /> : <DatabaseOutlined />} 
              color={product?.destination === 'SHOP' ? 'cyan' : 'blue'}
            >
              {product?.destination === 'SHOP' ? 'Direct to Shop' : 'Goes to Warehouse'}
            </Tag>
          </Space>
        </Space>
        
        <Space>
          <Button 
            icon={<BarChartOutlined />} 
            onClick={() => navigate(product?.destination === 'SHOP' ? `/inventory/shop?product=${id}` : `/inventory/store?product=${id}`)}
          >
            Check Stock
          </Button>
          <Button 
            icon={<EditOutlined />} 
            type="primary" 
            ghost 
            onClick={() => setIsEditModalVisible(true)} 
            style={{ color: '#714B67', borderColor: '#714B67' }}
          >
            Edit
          </Button>
          <Popconfirm title="Delete Product?" onConfirm={handleDelete} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Descriptions title="Full Product Specifications" bordered column={2}>
          <Descriptions.Item label="Product Name" span={2}><strong>{product?.name}</strong></Descriptions.Item>
          <Descriptions.Item label="Category">{product?.category_display}</Descriptions.Item>
          <Descriptions.Item label="Primary Vendor">{product?.vendor_name || 'Not Linked'}</Descriptions.Item>
          
          <Descriptions.Item label="Inventory Destination" span={2}>
            {product?.destination === 'SHOP' 
              ? 'External deliveries for this product bypass the warehouse and go directly to the shop floor.' 
              : 'External deliveries for this product are stored in the warehouse before being transferred to the shop.'}
          </Descriptions.Item>

          <Descriptions.Item label="Pack Multiplier">
            <Text type="success">{product?.pieces_per_pack} pieces per pack</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Prices (per piece)">
             <Space direction="vertical">
               <Text>Buy: <span style={{ fontWeight: 600 }}>ETB {product?.buying_price_per_piece}</span></Text>
               <Text>Sell: <span style={{ fontWeight: 600 }}>ETB {product?.selling_price_per_piece}</span></Text>
             </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <CreateProductModal 
        key={product?.id || 'new'}
        visible={isEditModalVisible}
        initialValues={product}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          fetchProduct();
        }}
      />
    </div>
  );
};

export default ProductDetail;