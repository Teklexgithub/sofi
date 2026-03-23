import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Typography, Card, message } from 'antd';
import { PlusOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserAccount } from '../../types/settings';
import CreateUserModal from './CreateUserModal';

const { Title, Text } = Typography;

const UserList: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getUsers();
      setUsers(response.data);
    } catch (error) {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const columns = [
    { 
      title: 'User', 
      key: 'user',
      render: (record: UserAccount) => (
        <Space>
          <UserOutlined style={{ color: '#714B67' }} />
          <Button 
            type="link" 
            onClick={() => navigate(`/settings/users/${record.id}`)} 
            style={{ padding: 0, fontWeight: 'bold' }}
          >
            {record.email}
          </Button>
        </Space>
      )
    },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => {
        let color = role === 'ADMIN' ? 'volcano' : role === 'MANAGER' ? 'blue' : 'green';
        return <Tag color={color}>{role}</Tag>;
      }
    },
    { 
      title: 'Branch', 
      dataIndex: 'branch_name', // Ensure your serializer provides this or map it
      key: 'branch' 
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: UserAccount) => (
        <Button type="link" onClick={() => navigate(`/settings/users/${record.id}`)}>View Profile</Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0 }}>System Users</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#714B67', border: 'none' }}
          >
            Create User
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: '0' } }} style={{ 
        borderRadius: '8px', 
        background: isDark ? '#1f1f1f' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #f0f0f0',
        overflow: 'hidden'
      }}>
        <Table 
          columns={columns} 
          dataSource={users} 
          loading={loading} 
          rowKey="id" 
        />
      </Card>

      <CreateUserModal 
        visible={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        onSuccess={() => { setIsModalVisible(false); fetchUsers(); }} 
      />
    </div>
  );
};

export default UserList;