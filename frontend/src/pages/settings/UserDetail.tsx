import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, ShopOutlined, MailOutlined } from '@ant-design/icons';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserAccount } from '../../types/settings';
import CreateUserModal from './CreateUserModal';

const { Title, Text } = Typography;

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [userData, setUserData] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getUserDetail(id!);
      setUserData(response.data);
    } catch (error) {
      message.error("Could not load user details");
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
      message.success("User account deactivated");
      navigate('/settings/users');
    } catch (error) {
      message.error("Failed to delete user");
    }
  };

  if (!userData && !loading) return <div>User not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/settings/users')} style={{ cursor: 'pointer', color: '#714B67' }}>
            Users
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{userData?.email}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{userData?.first_name} {userData?.last_name}</Title>
          <Text type="secondary"><MailOutlined /> {userData?.email}</Text>
        </Space>
        
        <Space>
          {/* Smart Button: Link to the assigned branch */}
          {userData?.branch && (
            <Button 
              icon={<ShopOutlined />} 
              onClick={() => navigate(`/settings/branches/${userData.branch}`)}
            >
              View Branch
            </Button>
          )}
          <Button icon={<EditOutlined />} type="primary" ghost onClick={() => setIsEditModalVisible(true)}>
            Edit
          </Button>
          <Popconfirm title="Delete this user?" onConfirm={handleDelete} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title="Account Details" bordered column={2}>
          <Descriptions.Item label="Email">{userData?.email}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={userData?.role === 'ADMIN' ? 'volcano' : 'blue'}>{userData?.role}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Branch Assignment" span={2}>
             {userData?.branch ? 'Assigned to Branch' : 'Global / No Branch'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <CreateUserModal 
        visible={isEditModalVisible}
        initialValues={userData}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          fetchUser();
        }}
      />
    </div>
  );
};

export default UserDetail;