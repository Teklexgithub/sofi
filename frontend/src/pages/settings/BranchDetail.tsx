import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, ContainerOutlined } from '@ant-design/icons';
import { settingsService } from '../../services/settingsService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Branch } from '../../types/settings';
import CreateBranchModal from './CreateBranchModal';

const { Title } = Typography;

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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/settings/branches')} style={{ cursor: 'pointer', color: '#4A5B6D' }}>
            Branches
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{branch?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Title level={2} style={{ margin: 0 }}>{branch?.name}</Title>
        <Space>
          <Button icon={<ContainerOutlined />} onClick={() => navigate(`/inventory/store?branch=${id}`)}>
            Branch Inventory
          </Button>
          <Button icon={<EditOutlined />} type="primary" ghost onClick={() => setIsEditModalVisible(true)}>
            Edit
          </Button>
          <Popconfirm title="Delete this branch?" onConfirm={handleDelete}>
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title="Branch Information" bordered column={1}>
          <Descriptions.Item label="Name">{branch?.name}</Descriptions.Item>
          <Descriptions.Item label="Location">{branch?.location || 'Not Specified'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <CreateBranchModal 
        visible={isEditModalVisible}
        initialValues={branch}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => { setIsEditModalVisible(false); fetchBranch(); }}
      />
    </div>
  );
};

export default BranchDetail;