import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, BarChartOutlined, ShopOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
// Removed unused Product import to fix "value is never read" error
import CreateProductModal from './CreateProductModal';

const { Title, Text } = Typography;

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { t } = useTranslation('inventory');

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getProductDetail(id!);
      setProduct(response.data);
    } catch (error) {
      message.error(t('productDetail.loadFailed'));
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
      message.success(t('productDetail.deleteSuccess'));
      navigate('/inventory/products');
    } catch (error) {
      message.error(t('productDetail.deleteFailed'));
    }
  };

  // Fixed the 'danger' prop error here by using type="danger"
  if (!product && !loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <Text type="danger">{t('productDetail.notFound')}</Text>
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/inventory/products')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            {t('common:fields.products')}
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
              {product?.destination === 'SHOP' ? t('productDetail.directToShop') : t('productDetail.goesToWarehouse')}
            </Tag>
          </Space>
        </Space>

        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => navigate(product?.destination === 'SHOP' ? `/inventory/shop?product=${id}` : `/inventory/store?product=${id}`)}
          >
            {t('productDetail.checkStock')}
          </Button>
          <Button
            icon={<EditOutlined />}
            type="primary"
            ghost
            onClick={() => setIsEditModalVisible(true)}
            style={{ color: '#714B67', borderColor: '#714B67' }}
          >
            {t('common:actions.edit')}
          </Button>
          <Popconfirm title={t('productDetail.deleteConfirmTitle')} onConfirm={handleDelete} okText={t('common:actions.yes')} cancelText={t('common:actions.no')}>
            <Button icon={<DeleteOutlined />} danger>{t('common:actions.delete')}</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Descriptions title={t('productDetail.fullSpecs')} bordered column={2}>
          <Descriptions.Item label={t('productDetail.productNameLabel')} span={2}><strong>{product?.name}</strong></Descriptions.Item>
          <Descriptions.Item label={t('common:fields.category')}>{product?.category_display}</Descriptions.Item>
          <Descriptions.Item label={t('productDetail.primaryVendor')}>{product?.vendor_name || t('productDetail.notLinked')}</Descriptions.Item>

          <Descriptions.Item label={t('productDetail.inventoryDestination')} span={2}>
            {product?.destination === 'SHOP'
              ? t('productDetail.destinationShopDesc')
              : t('productDetail.destinationStoreDesc')}
          </Descriptions.Item>

          <Descriptions.Item label={t('productDetail.packMultiplier')}>
            <Text type="success">{product?.pieces_per_pack} {t('productDetail.piecesPerPack')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('productDetail.pricesPerPiece')}>
             <Space direction="vertical">
               <Text>{t('productDetail.buy')}: <span style={{ fontWeight: 600 }}>{t('common:units.etb')} {product?.buying_price_per_piece}</span></Text>
               <Text>{t('productDetail.sell')}: <span style={{ fontWeight: 600 }}>{t('common:units.etb')} {product?.selling_price_per_piece}</span></Text>
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