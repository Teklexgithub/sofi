import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Typography, Card, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Product } from '../../types/inventory';
import CreateProductModal from './CreateProductModal';

const { Title, Text } = Typography;

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); // Track product for editing
  const { isDark } = useTheme();
  const navigate = useNavigate(); // Initialize navigation
  const { t } = useTranslation('inventory');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getProducts();
      setProducts(response.data);
    } catch (error) {
      message.error(t('productList.syncFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Open modal for a new product
  const handleCreate = () => {
    setSelectedProduct(null); // Clear selection
    setIsModalVisible(true);
  };

  // Open modal for editing an existing product
  const handleEdit = (record: Product) => {
    setSelectedProduct(record); // Set current product
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: t('productList.columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        /* Navigate to Detail View on click */
        <Button
          type="link"
          onClick={() => navigate(`/inventory/products/${record.id}`)}
          style={{ padding: 0, fontWeight: 'bold' }}
        >
          {text}
        </Button>
      )
    },
    {
      title: t('common:fields.category'),
      dataIndex: 'category_display',
      key: 'category',
      render: (text: string) => (
        <Tag color={isDark ? 'gold' : 'purple'}>{text}</Tag>
      )
    },
    { title: t('common:fields.vendor'), dataIndex: 'vendor_name', key: 'vendor' },
    { title: t('productList.columns.packMultiplier'), dataIndex: 'pieces_per_pack', key: 'pieces' },
    {
      title: t('productList.columns.priceSingle'),
      dataIndex: 'selling_price_per_piece',
      key: 'price',
      render: (price: string) => <Text style={{ color: '#52c41a' }}>{`${t('common:units.etb')} ${price}`}</Text>
    },
    {
      title: t('common:fields.action'),
      key: 'action',
      render: (_: any, record: Product) => (
        /* Edit button triggers the modal with initialValues */
        <Button type="link" onClick={() => handleEdit(record)}>{t('common:actions.edit')}</Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0 }}>{t('productList.title')}</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchProducts} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate} // Call handleCreate to clear previous state
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
        <div style={{ padding: '16px', borderBottom: isDark ? '1px solid #333' : '1px solid #f0f0f0' }}>
          <Input
            placeholder={t('productList.searchPlaceholder')}
            prefix={<SearchOutlined />}
            style={{ width: 300, background: isDark ? '#262626' : '#fff' }}
          />
        </div>
        
        <Table
          columns={columns}
          dataSource={products}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <CreateProductModal 
        visible={isModalVisible} 
        initialValues={selectedProduct} // Pass the selected product for editing
        onCancel={() => setIsModalVisible(false)} 
        onSuccess={() => {
          setIsModalVisible(false);
          fetchProducts(); 
        }} 
      />
    </div>
  );
};

export default ProductList;