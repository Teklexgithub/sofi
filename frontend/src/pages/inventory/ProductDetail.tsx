import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Product } from '../../types/inventory';
import CreateProductModal from './CreateProductModal';

const { Title } = Typography;

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [product, setProduct] = useState<Product | null>(null);
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

  if (!product && !loading) return <div>Product not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/inventory/products')} style={{ cursor: 'pointer', color: '#714B67' }}>
            Products
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{product?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{product?.name}</Title>
          <Tag color={isDark ? 'gold' : 'purple'}>{product?.category_display}</Tag>
        </Space>
        
        <Space>
          <Button 
            icon={<BarChartOutlined />} 
            onClick={() => navigate(`/inventory/store?product=${id}`)}
          >
            Check Stock
          </Button>
          <Button icon={<EditOutlined />} type="primary" ghost onClick={() => setIsEditModalVisible(true)}>
            Edit
          </Button>
          <Popconfirm title="Delete Product?" onConfirm={handleDelete} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title="Product Information" bordered column={2}>
          <Descriptions.Item label="Name" span={2}>{product?.name}</Descriptions.Item>
          <Descriptions.Item label="Category">{product?.category_display}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{product?.vendor_name || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Pack Multiplier">{product?.pieces_per_pack} pieces/pack</Descriptions.Item>
          <Descriptions.Item label="Buying Price">ETB {product?.buying_price_per_piece}</Descriptions.Item>
          <Descriptions.Item label="Selling Price">ETB {product?.selling_price_per_piece}</Descriptions.Item>
        </Descriptions>
      </Card>

      <CreateProductModal 
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