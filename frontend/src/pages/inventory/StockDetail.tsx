import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Typography, Breadcrumb, message, Spin } from 'antd';
import { EditOutlined, HistoryOutlined, ShopOutlined, InboxOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import AdjustStoreStockModal from './AdjustStoreStockModal';

const { Title, Text } = Typography;

interface StockDetailProps {
  type: 'store' | 'shop';
}

const StockDetail: React.FC<StockDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation('inventory');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);

  // Strictly restrict adjustment functionality to ADMIN only
  const isAdmin = user?.role === 'ADMIN';

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = type === 'store'
        ? await inventoryService.getStoreStockDetail(id)
        : await inventoryService.getShopStockDetail(id);
      setData(res.data);
    } catch (e) {
      message.error(t('stockDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, type]);

  const handleMovementLogs = () => {
    // Navigate based on context: Store uses Supply Logs, Shop uses Internal Transfers
    const path = type === 'store' ? '/inventory/supply-logs' : '/inventory/transfers';
    navigate(`${path}?product=${data?.product}`);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  if (!data) return <div style={{ padding: '50px', textAlign: 'center' }}><Text type="danger">{t('stockDetail.notFound')}</Text></div>;

  const currentQuantity = type === 'store' ? data.quantity_in_packs : data.quantity_in_pieces;
  const unitLabel = type === 'store' ? t('common:units.packs') : t('common:units.pieces');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span
            onClick={() => navigate(type === 'store' ? '/inventory/store' : '/inventory/shop')}
            style={{ cursor: 'pointer', color: '#714B67', fontWeight: '500' }}
          >
            {type === 'store' ? t('stockDetail.storeStockBreadcrumb') : t('stockDetail.shopStockBreadcrumb')}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{data.product_name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>
            {type === 'store' ? (
              <InboxOutlined style={{ marginRight: 8, color: '#714B67' }} />
            ) : (
              <ShopOutlined style={{ marginRight: 8, color: '#714B67' }} />
            )}
            {data.product_name}
          </Title>
          <Text type="secondary">{t('stockDetail.subtitle')}</Text>
        </Space>

        <Space>
          <Button icon={<HistoryOutlined />} onClick={handleMovementLogs}>
            {t('stockDetail.movementLogs')}
          </Button>

          {/* Logic: Button only renders for Admins */}
          {isAdmin && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              style={{ background: '#714B67', border: 'none' }}
              onClick={() => setIsAdjustModalVisible(true)}
            >
              {t('stockDetail.adjustButton', { unit: unitLabel })}
            </Button>
          )}
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
          <Descriptions title={t('stockDetail.currentLevels')} column={1} bordered>
            <Descriptions.Item label={t('common:fields.quantity')}>
              <Text strong style={{ fontSize: '20px', color: '#714B67' }}>
                {currentQuantity} {unitLabel}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('common:fields.status')}>
              <Tag color={currentQuantity > 0 ? 'green' : 'red'}>
                {currentQuantity > 0 ? t('stockDetail.inStock') : t('stockDetail.outOfStock')}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
          <Descriptions title={t('stockDetail.locationInfo')} column={1} bordered>
            <Descriptions.Item label={t('common:fields.branch')}>
               <Tag color="blue" style={{ fontWeight: 'bold' }}>
                 {data.branch_name || t('stockDetail.mainWarehouse')}
               </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('stockDetail.inventoryType')}>
               {type === 'store' ? t('stockDetail.bulkStorage') : t('stockDetail.retailDisplay')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      {/* Shared Modal: Handles both Pack and Piece adjustments */}
      <AdjustStoreStockModal 
        visible={isAdjustModalVisible}
        type={type}
        initialData={data}
        onCancel={() => setIsAdjustModalVisible(false)}
        onSuccess={() => {
          setIsAdjustModalVisible(false);
          fetchData(); // Triggers real-time refresh of the UI
        }}
      />
    </div>
  );
};

export default StockDetail;