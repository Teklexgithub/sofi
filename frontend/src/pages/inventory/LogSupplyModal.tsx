import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, Input, DatePicker, message, Divider } from 'antd';
import { inventoryService } from '../../services/inventoryService';
import { settingsService } from '../../services/settingsService'; // To fetch branches
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

interface LogSupplyProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  branchId: string; // The branch currently selected in the Header Switcher
}

const LogSupplyModal: React.FC<LogSupplyProps> = ({ visible, onCancel, onSuccess, branchId }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (visible) {
      // Load products and branches (if admin)
      inventoryService.getProducts().then(res => setProducts(res.data));
      
      if (isAdmin) {
        settingsService.getBranches().then(res => setBranches(res.data));
      }

      form.setFieldsValue({ 
        branch: branchId, // Defaults to the current active branch from header
        date_received: dayjs(),
      });
    }
  }, [visible, branchId, isAdmin, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        date_received: values.date_received.toISOString(),
      };
      await inventoryService.logSupply(payload);
      message.success('Stock added to Store successfully');
      form.resetFields();
      onSuccess();
    } catch (e) {
      message.error('Failed to log supply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      title="Record Vendor Delivery" 
      open={visible} 
      onOk={() => form.submit()} 
      onCancel={onCancel}
      confirmLoading={loading}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        {/* Branch Logic: Show for Admin, Hidden for Staff */}
        {isAdmin ? (
          <Form.Item name="branch" label="Receiving Branch" rules={[{ required: true }]}>
            <Select placeholder="Select the branch receiving this stock">
              {branches.map((b: any) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item name="branch" hidden>
            <Input />
          </Form.Item>
        )}

        <Form.Item name="product" label="Product" rules={[{ required: true }]}>
          <Select placeholder="Select Product" showSearch filterOption={(input, option) =>
            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
          }>
            {products.map((p: any) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="packs_received" label="Packs Received" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0.5} precision={2} placeholder="0.00" />
        </Form.Item>

        <Form.Item name="date_received" label="Date/Time Received" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="manager_notes" label="Manager Notes">
          <Input.TextArea rows={2} placeholder="Optional delivery notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LogSupplyModal;