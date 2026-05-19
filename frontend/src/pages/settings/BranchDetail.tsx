import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Breadcrumb, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, ContainerOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Branch } from '../../types/settings';
import CreateBranchModal from './CreateBranchModal';

const { Title, Text } = Typography;

const BranchDetail: React.FC = () => {
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
      message.error("Could not load branch details");
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
      message.success("Branch removed");
      navigate('/settings/branches');
    } catch (error) {
      message.error("Cannot delete branch with active inventory");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/settings/branches')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            Branches
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{branch?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{branch?.name}</Title>
          <Tag color="blue">Registered Branch</Tag>
        </Space>
        <Space>
          <Button icon={<ContainerOutlined />} onClick={() => navigate(`/inventory/store?branch=${id}`)}>
            Branch Inventory
          </Button>
          <Button 
            icon={<EditOutlined />} 
            type="primary" 
            ghost 
            onClick={() => setIsEditModalVisible(true)}
            style={{ borderColor: '#714B67', color: '#714B67' }}
          >
            Edit
          </Button>
          <Popconfirm 
            title="Delete this branch?" 
            description="All branch-specific data will be lost."
            onConfirm={handleDelete}
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title="Branch Contact & Location Information" bordered column={1}>
          <Descriptions.Item label={<span><EnvironmentOutlined /> Location</span>}>
            {branch?.location || 'Not Specified'}
          </Descriptions.Item>
          <Descriptions.Item label={<span><PhoneOutlined /> Primary Phone</span>}>
            <Text strong>{branch?.phone_no || 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={<span><PhoneOutlined /> Secondary Phone</span>}>
            {branch?.phone_no_second || 'N/A'}
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