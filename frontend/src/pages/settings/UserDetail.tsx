import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, ShopOutlined, MailOutlined, KeyOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import CreateUserModal from './CreateUserModal';
import ResetPasswordModal from './ResetPasswordModal';

const { Title, Text } = Typography;

const UserDetail: React.FC = () => {
  const { t } = useTranslation('settings');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);

  // Strictly enforce Admin-only view for the reset button
  const isGlobalAdmin = user?.role === 'ADMIN';

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getUserDetail(id!);
      setUserData(response.data);
    } catch (error) {
      message.error(t('common:messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  const handleDelete = async () => {
    try {
      await settingsService.deleteUser(id!);
      message.success(t('userDetail.deactivateSuccess'));
      navigate('/settings/users');
    } catch (error) {
      message.error(t('userDetail.deactivateFailed'));
    }
  };

  if (!userData && !loading) return <div style={{ padding: '20px' }}><Text type="danger">{t('userDetail.notFound')}</Text></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/settings/users')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            {t('userDetail.usersBreadcrumb')}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{userData?.email}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{userData?.email}</Title>
          <Space>
             <Tag color={userData?.role === 'ADMIN' ? 'volcano' : 'blue'}>{userData?.role ? t(`common:roles.${userData.role}`) : ''}</Tag>
             {userData?.is_active ? <Tag color="green">{t('common:status.active')}</Tag> : <Tag color="red">{t('common:status.inactive')}</Tag>}
          </Space>
        </Space>

        <Space>
          {/* Admin Override: Reset Password on-system */}
          {isGlobalAdmin && (
            <Button
              icon={<KeyOutlined />}
              danger
              onClick={() => setIsResetModalVisible(true)}
            >
              {t('userDetail.resetPasswordButton')}
            </Button>
          )}

          <Button
            icon={<EditOutlined />}
            type="primary"
            ghost
            onClick={() => setIsEditModalVisible(true)}
            style={{ color: '#714B67', borderColor: '#714B67' }}
          >
            {t('userDetail.editProfileButton')}
          </Button>

          <Popconfirm
            title={t('userDetail.deactivateConfirmTitle')}
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
        <Descriptions title={t('userDetail.sectionTitle')} bordered column={2}>
          <Descriptions.Item label={t('common:fields.email')} span={2}>
            <MailOutlined style={{ marginRight: 8 }} />
            {userData?.email}
          </Descriptions.Item>
          <Descriptions.Item label={t('common:fields.role')}>{userData?.role ? t(`common:roles.${userData.role}`) : ''}</Descriptions.Item>
          <Descriptions.Item label={t('userList.columns.branchAssignment')}>
             {userData?.branch_details && userData.branch_details.length > 0 ? (
               <Space wrap>
                 {userData.branch_details.map((b: { id: string; name: string }) => (
                   <Button key={b.id} type="link" style={{ padding: 0 }} onClick={() => navigate(`/settings/branches/${b.id}`)}>
                     <ShopOutlined style={{ marginRight: 4 }} /> {b.name}
                   </Button>
                 ))}
               </Space>
             ) : (
               <Tag icon={<GlobalOutlined />}>{t('userList.globalAccess')}</Tag>
             )}
          </Descriptions.Item>
          <Descriptions.Item label={t('userDetail.joinedDateLabel')}>
            {userData?.date_joined ? new Date(userData.date_joined).toLocaleDateString() : t('userDetail.notAvailable')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

     <CreateUserModal 
      key={userData?.id || 'new'} // <--- ADD THIS LINE
      visible={isEditModalVisible}
      initialValues={userData}
      onCancel={() => setIsEditModalVisible(false)}
      onSuccess={() => {
        setIsEditModalVisible(false);
        fetchUser();
      }}
    />

      {/* The Actual "On-System" Reset Component */}
      <ResetPasswordModal 
        visible={isResetModalVisible}
        userId={id!}
        userEmail={userData?.email}
        onCancel={() => setIsResetModalVisible(false)}
      />
    </div>
  );
};

export default UserDetail;