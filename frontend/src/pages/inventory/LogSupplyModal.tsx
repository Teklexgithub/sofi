import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Button, Space, DatePicker, message, Divider, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, ShopOutlined, DatabaseOutlined } from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { settingsService } from '../../services/settingsService';
import { useAuth } from '../../contexts/AuthContext'; // Import Auth
import dayjs from 'dayjs';

const { Text } = Typography;

// UPDATED: Added branchId to props
interface LogSupplyProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  branchId: string; 
}

const LogSupplyModal: React.FC<LogSupplyProps> = ({ visible, onCancel, onSuccess, branchId }) => {
  const [form] = Form.useForm();
  const { user } = useAuth(); // Access logged in user
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (visible) {
      // 1. Load Data
      inventoryService.getProducts().then(res => setProducts(res.data));
      
      // 2. Only fetch all branches if the user is an Admin
      if (isAdmin) {
        settingsService.getBranches().then(res => setBranches(res.data));
      }
      
      // 3. AUTO-LOCK Logic:
      // Set the branch from the prop (which is the user's branch for managers)
      form.setFieldsValue({ 
        branch: branchId,
        date_received: dayjs(),
        items: [{}] 
      });
    }
  }, [visible, form, branchId, isAdmin]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        branch: values.branch,
        date_received: values.date_received.toISOString(),
        items: values.items
      };
      
      // Ensure your service has the bulk create method
      await inventoryService.bulkCreateSupplyLog(payload);
      message.success(`Successfully logged ${values.items.length} deliveries`);
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      const msg = error.response?.data?.error || "Failed to log deliveries.";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span><DatabaseOutlined style={{color: '#714B67'}} /> Log Vendor Deliveries</span>}
      open={visible}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={900}
      okText="Save All Deliveries"
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Space size="large" style={{ width: '97%', background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          
          {/* BRANCH LOCK UI */}
          {isAdmin ? (
            <Form.Item 
              name="branch" 
              label="Receiving Branch" 
              rules={[{ required: true }]} 
              style={{ minWidth: 250, marginBottom: 0 }}
            >
              <Select placeholder="Select Branch">
                {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
              </Select>
            </Form.Item>
          ) : (
            <div style={{ minWidth: 250 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Receiving Branch</Text>
              <div style={{ fontWeight: 'bold', color: '#714B67', padding: '4px 0' }}>
                 Your Assigned Branch
              </div>
              {/* Hidden field so the value is still submitted in the form */}
              <Form.Item name="branch" hidden><Select /></Form.Item>
            </div>
          )}

          <Form.Item name="date_received" label="Date & Time Received" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Divider>Delivery Items</Divider>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card 
                  key={key} 
                  size="small" 
                  style={{ marginBottom: 12, background: '#f9f9f9', border: '1px solid #e8e8e8' }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <Space align="start" size="middle">
                    <Form.Item
                      {...restField}
                      name={[name, 'product']}
                      label="Product"
                      rules={[{ required: true, message: 'Missing product' }]}
                      style={{ width: 350, marginBottom: 0 }}
                    >
                      <Select 
                        showSearch 
                        placeholder="Search Product"
                        optionFilterProp="children"
                      >
                        {products.map(p => (
                          <Select.Option key={p.id} value={p.id}>
                            <Space>
                              {p.destination === 'SHOP' ? <ShopOutlined style={{color: '#13c2c2'}}/> : <DatabaseOutlined style={{color: '#1890ff'}}/>}
                              {p.name} <Text type="secondary" style={{fontSize: '11px'}}>[{p.vendor_name || 'No Vendor'}]</Text>
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'packs_received']}
                      label="Qty (Packs)"
                      rules={[{ required: true, message: 'Missing qty' }]}
                      style={{ width: 120, marginBottom: 0 }}
                    >
                      <InputNumber min={0.1} placeholder="0.0" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'manager_notes']}
                      label="Notes"
                      style={{ width: 200, marginBottom: 0 }}
                    >
                      <Select placeholder="Optional Note" allowClear>
                        <Select.Option value="Fresh Stock">Fresh Stock</Select.Option>
                        <Select.Option value="Replenish">Replenish</Select.Option>
                      </Select>
                    </Form.Item>

                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => remove(name)} 
                      style={{ marginTop: 30 }}
                      disabled={fields.length === 1} // Prevent deleting the last row
                    />
                  </Space>
                </Card>
              ))}
              <Button 
                type="dashed" 
                onClick={() => add()} 
                block 
                icon={<PlusOutlined />}
                style={{ marginTop: 8, height: '40px' }}
              >
                Add Another Vendor Delivery
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default LogSupplyModal;