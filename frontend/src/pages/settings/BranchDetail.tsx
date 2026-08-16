import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Breadcrumb, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, ContainerOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Branch } from '../../types/settings';
import CreateBranchModal from './CreateBranchModal';

const { Title, Text } = Typography;

const BranchDetail: React.FC = () => {
  const { t } = useTranslation('settings');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchBranch = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getBranchDetail(id!);
      setBranch(response.data);
    } catch (error) {
      message.error(t('common:messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBranch();
  }, [id]);

  const handleDelete = async () => {
    try {
      await settingsService.deleteBranch(id!);
      message.success(t('branchDetail.deleteSuccess'));
      navigate('/settings/branches');
    } catch (error) {
      message.error(t('branchDetail.deleteFailed'));
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/settings/branches')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            {t('branches.title')}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{branch?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{branch?.name}</Title>
          <Tag color="blue">{t('branchDetail.registeredBranchTag')}</Tag>
        </Space>
        <Space>
          <Button icon={<ContainerOutlined />} onClick={() => navigate(`/inventory/store?branch=${id}`)}>
            {t('branchDetail.branchInventoryButton')}
          </Button>
          <Button
            icon={<EditOutlined />}
            type="primary"
            ghost
            onClick={() => setIsEditModalVisible(true)}
            style={{ borderColor: '#714B67', color: '#714B67' }}
          >
            {t('common:actions.edit')}
          </Button>
          <Popconfirm
            title={t('branchDetail.deleteConfirmTitle')}
            description={t('branchDetail.deleteConfirmDesc')}
            onConfirm={handleDelete}
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger>{t('common:actions.delete')}</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title={t('branchDetail.sectionTitle')} bordered column={1}>
          <Descriptions.Item label={<span><EnvironmentOutlined /> {t('common:fields.location')}</span>}>
            {branch?.location || t('branchDetail.notSpecified')}
          </Descriptions.Item>
          <Descriptions.Item label={<span><PhoneOutlined /> {t('branchDetail.primaryPhoneLabel')}</span>}>
            <Text strong>{branch?.phone_no || t('branchDetail.notAvailable')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={<span><PhoneOutlined /> {t('branchDetail.secondaryPhoneLabel')}</span>}>
            {branch?.phone_no_second || t('branchDetail.notAvailable')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <CreateBranchModal 
        visible={isEditModalVisible}
        initialValues={branch}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => { 
          setIsEditModalVisible(false); 
          fetchBranch(); 
        }}
      />
    </div>
  );
};

export default BranchDetail;