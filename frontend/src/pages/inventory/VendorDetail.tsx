import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, HistoryOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import CreateVendorModal from './CreateVendorModal';

const { Title } = Typography;

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchVendor = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getVendorDetail(id!);
      setVendor(response.data);
    } catch (error) {
      message.error("Could not load vendor details");
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
      message.success("Vendor removed from Sofia ERP");
      navigate('/inventory/vendors');
    } catch (error) {
      message.error("Failed to delete vendor");
    }
  };

  if (!vendor && !loading) return <div style={{ padding: '20px' }}>Vendor not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/inventory/vendors')} style={{ cursor: 'pointer', color: '#714B67', fontWeight: 500 }}>
            Vendors
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{vendor?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{vendor?.name}</Title>
          <Tag color="purple">Verified Vendor</Tag>
        </Space>
        
        <Space>
          <Button 
            icon={<HistoryOutlined />} 
            onClick={() => navigate(`/inventory/supply-logs?vendor=${id}`)}
          >
            Delivery History
          </Button>
          
          <Button 
            icon={<EditOutlined />} 
            type="primary" 
            ghost 
            onClick={() => setIsEditModalVisible(true)}
          >
            Edit
          </Button>

          <Popconfirm 
            title="Delete Vendor?" 
            description="This action cannot be undone."
            onConfirm={handleDelete} 
            okText="Yes" 
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Card loading={loading} style={{ borderRadius: '8px', background: isDark ? '#1f1f1f' : '#fff' }}>
        <Descriptions title="Business Contact & Billing" bordered column={1}>
          <Descriptions.Item label="Vendor Name">{vendor?.name}</Descriptions.Item>
          <Descriptions.Item label="Contact Person">{vendor?.contact_person || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label={<span><PhoneOutlined /> Phone Number</span>}>
            {vendor?.phone_no || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label={<span><BankOutlined /> Bank Account</span>}>
            {vendor?.bank_account || 'N/A'}
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