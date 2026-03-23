import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Typography, Tag, Breadcrumb, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import type { Vendor } from '../../types/inventory';
import CreateVendorModal from './CreateVendorModal'; // Import the modal we just updated

const { Title } = Typography;

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // State for Edit Modal

  const fetchVendor = async () => {
    setLoading(true);
    try {
      // Fetching specifically by ID using the new service method
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
      await inventoryService.deleteVendor(id!); // Use the delete method
      message.success("Vendor removed from Sofia ERP");
      navigate('/inventory/vendors'); // Go back to list
    } catch (error) {
      message.error("Failed to delete vendor");
    }
  };

  if (!vendor && !loading) return <div>Vendor not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Odoo-style Breadcrumbs */}
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/inventory/vendors')} style={{ cursor: 'pointer', color: '#714B67' }}>
            Vendors
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{vendor?.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>{vendor?.name}</Title>
          <Tag color="blue">Active Vendor</Tag>
        </Space>
        
        <Space>
          <Button 
            icon={<HistoryOutlined />} 
            onClick={() => navigate(`/inventory/supply-logs?vendor=${id}`)}
          >
            Delivery History
          </Button>
          
          {/* Edit Button - Now active! */}
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
        <Descriptions title="General Information" bordered column={1}>
          <Descriptions.Item label="Vendor Name">{vendor?.name}</Descriptions.Item>
          <Descriptions.Item label="Contact Person">{vendor?.contact_person || 'N/A'}</Descriptions.Item>
          {/* Internal ID Row Removed for cleaner UI */}
        </Descriptions>
      </Card>

      {/* Edit Modal */}
      <CreateVendorModal 
        visible={isEditModalVisible}
        initialValues={vendor} // Pass the current data to the form
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          fetchVendor(); // Refresh data on this page
        }}
      />
    </div>
  );
};

export default VendorDetail;