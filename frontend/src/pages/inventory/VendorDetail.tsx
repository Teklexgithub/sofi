import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, HistoryOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import CreateVendorModal from './CreateVendorModal';

const { Title } = Typography;

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { t } = useTranslation('inventory');

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchVendor = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getVendorDetail(id!);
      setVendor(response.data);
    } catch (error) {
      message.error(t('vendorDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchVendor();
  }, [id]);

  const handleDelete = async () => {
    try {
      await inventoryService.deleteVendor(id!);
      message.success(t('vendorDetail.deleteSuccess'));
      navigate('/inventory/vendors');
    } catch (error) {
      message.error(t('vendorDetail.deleteFailed'));
    }
  };

  if (!vendor && !loading) return <div style={{ padding: '20px' }}>{t('vendorDetail.notFound')}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/inventory/vendors')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            {t('common:fields.vendors')}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{vendor?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{vendor?.name}</Title>
          <Tag color="purple">{t('vendorDetail.verifiedVendor')}</Tag>
        </Space>

        <Space>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/inventory/supply-logs?vendor=${id}`)}
          >
            {t('vendorDetail.deliveryHistory')}
          </Button>

          <Button
            icon={<EditOutlined />}
            type="primary"
            ghost
            onClick={() => setIsEditModalVisible(true)}
          >
            {t('common:actions.edit')}
          </Button>

          <Popconfirm
            title={t('vendorDetail.deleteConfirmTitle')}
            description={t('common:messages.confirmDeleteDesc')}
            onConfirm={handleDelete}
            okText={t('common:actions.yes')}
            cancelText={t('common:actions.no')}
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger>{t('common:actions.delete')}</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title={t('vendorDetail.businessContact')} bordered column={1}>
          <Descriptions.Item label={t('vendorDetail.vendorNameLabel')}>{vendor?.name}</Descriptions.Item>
          <Descriptions.Item label={t('common:fields.contactPerson')}>{vendor?.contact_person || t('vendorDetail.notAvailable')}</Descriptions.Item>
          <Descriptions.Item label={<span><PhoneOutlined /> {t('common:fields.phoneNumber')}</span>}>
            {vendor?.phone_no || t('vendorDetail.notAvailable')}
          </Descriptions.Item>
          <Descriptions.Item label={<span><BankOutlined /> {t('vendorDetail.bankAccount')}</span>}>
            {vendor?.bank_account || t('vendorDetail.notAvailable')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <CreateVendorModal 
        visible={isEditModalVisible}
        initialValues={vendor}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          fetchVendor();
        }}
      />
    </div>
  );
};

export default VendorDetail;