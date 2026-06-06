import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Input, message, Alert } from 'antd';
import { inventoryService } from '../../services/inventoryService';

interface AdjustModalProps {
  visible: boolean;
  type: 'store' | 'shop'; 
  initialData: any;
  onCancel: () => void;
  onSuccess: () => void;
}

const AdjustStoreStockModal: React.FC<AdjustModalProps> = ({ 
  visible, type, initialData, onCancel, onSuccess 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        adjustment_value: type === 'store' ? initialData.quantity_in_packs : initialData.quantity_in_pieces,
        reason: '' // Clear reason on open
      });
    }
  }, [visible, initialData, type, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Use the custom adjustment actions we created in the ViewSet
      if (type === 'store') {
        await inventoryService.adjustStoreStock(initialData.id, values.adjustment_value);
      } else {
        await inventoryService.adjustShopStock(initialData.id, values.adjustment_value);
      }
      
      message.success(`${initialData.product_name} adjusted successfully`);
      onSuccess();
    } catch (e: any) {
      // Catch specific error messages from the backend (like "Permission Denied")
      const errorMsg = e.response?.data?.error || 'Failed to update stock';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      title={`Manual Audit: ${initialData?.product_name}`} 
      open={visible} 
      onOk={() => form.submit()} 
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Apply Correction"
      okButtonProps={{ danger: true }}
      destroyOnClose
    >
      <Alert 
        message="Admin Override Active" 
        description={`Changing the ${type === 'store' ? 'Packs' : 'Pieces'} count directly affects inventory value.`} 
        type="error" // Changed to error color (Red) to signal high importance
        showIcon 
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item 
            name="adjustment_value" 
            label={`New Correct Count (${type === 'store' ? 'Packs' : 'Pieces'})`} 
            rules={[{ required: true }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            step={type === 'store' ? 0.1 : 1} // Decimals for packs, whole numbers for pieces
          />
        </Form.Item>
        <Form.Item 
            name="reason" 
            label="Adjustment Reason" 
            rules={[{ required: true, message: 'Please provide a reason for the audit log' }]}
        >
          <Input.TextArea placeholder="Example: Damaged goods found, counting error during delivery, etc." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdjustStoreStockModal;