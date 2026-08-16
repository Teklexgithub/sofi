import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Typography, Card, Input, message } from 'antd';
import { PlusOutlined, ReloadOutlined, UserOutlined, GlobalOutlined, ShopOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserAccount } from '../../types/settings';
import CreateUserModal from './CreateUserModal';

const { Title, Text } = Typography;

const UserList: React.FC = () => {
  const { t } = useTranslation('settings');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getUsers();
      setUsers(response.data);
    } catch (error) {
      message.error(t('common:messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const columns = [
    {
      title: t('userList.columns.user'),
      key: 'user',
      render: (record: any) => (
        <Space>
          <UserOutlined style={{ color: '#714B67' }} />
          <Button
            type="link"
            onClick={() => navigate(`/settings/users/${record.id}`)}
            style={{ padding: 0, fontWeight: 'bold', color: isDark ? '#fff' : '#714B67' }}
          >
            {record.email}
          </Button>
        </Space>
      )
    },
    {
      title: t('common:fields.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const color = role === 'ADMIN' ? 'volcano' : 'blue';
        return <Tag color={color} style={{ fontWeight: '500' }}>{t(`common:roles.${role}`)}</Tag>;
      }
    },
    {
      title: t('userList.columns.branchAssignment'),
      dataIndex: 'branch_details',
      key: 'branch',
      render: (branchDetails: { id: string; name: string }[], record: UserAccount) => {
        if (record.role === 'ADMIN' && (!branchDetails || branchDetails.length === 0)) {
          return (
            <Space style={{ color: '#8c8c8c' }}>
              <GlobalOutlined />
              <span>{t('userList.globalAccess')}</span>
            </Space>
          );
        }
        if (!branchDetails || branchDetails.length === 0) {
          return (
            <Space>
              <ShopOutlined style={{ color: '#d9d9d9' }} />
              <Text>{t('userList.notAssigned')}</Text>
            </Space>
          );
        }
        return (
          <Space wrap>
            {branchDetails.map(b => (
              <Tag key={b.id} icon={<ShopOutlined />} color="blue">{b.name}</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: t('common:fields.action'),
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: UserAccount) => (
        <Button
            type="default"
            size="small"
            onClick={() => navigate(`/settings/users/${record.id}`)}
        >
            {t('common:actions.viewProfile')}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Space direction="vertical" size={0}>
          <Title level={3} style={{ margin: 0 }}>{t('userList.title')}</Title>
          <Text type="secondary">{t('userList.subtitle')}</Text>
        </Space>
        <Space>
          <Input
            placeholder={t('userList.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '260px' }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} title={t('userList.refreshTitle')} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
            style={{ background: '#714B67', border: 'none' }}
          >
            {t('userList.createButton')}
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: '0' } }} style={{
        borderRadius: '8px',
        background: isDark ? '#1f1f1f' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #f0f0f0',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
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