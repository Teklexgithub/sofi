import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, message, Divider } from 'antd';
import { inventoryService } from '../../services/inventoryService';
import { settingsService } from '../../services/settingsService';

/**
 * Props interface for strict TypeScript compliance
 */
interface AdjustModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues: any;
}

const AdjustStoreStockModal: React.FC<AdjustModalProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      // Fetch context data to show names instead of just IDs
      const loadData = async () => {
        try {
          const [branchRes, productRes] = await Promise.all([
            settingsService.getBranches(),
            inventoryService.getProducts()
          ]);
          setBranches(branchRes.data);
          setProducts(productRes.data);
          
          // Pre-fill the form with current values
          form.setFieldsValue({
            ...initialValues,
            // Ensure the product select shows the name if passed as an object
            product: initialValues?.product?.id || initialValues?.product
          });
        } catch (e) {
          message.error("Failed to load adjustment context");
        }
      };
      loadData();
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      // Using the patched method from your updated service
      await inventoryService.updateStoreStock(initialValues.id, values); 
      message.success('Store stock updated successfully');
      form.resetFields();
      onSuccess();
    } catch (e) { 
      message.error('Failed to update inventory level'); 
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal 
      title="Manual Stock Adjustment (Store/Packs)" 
      open={visible} 
      onOk={() => form.submit()} 
      onCancel={onCancel}
      confirmLoading={submitting}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      destroyOnClose // Ensures form resets on close
    >
      <Divider style={{ marginTop: 0 }} />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        <Form.Item label="Branch Context" name="branch">
           <Select disabled>
            {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
          </Select>
        </Form.Item>

        <Form.Item name="product" label="Product">
          <Select disabled>
            {products.map((p: any) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="quantity_in_packs" 
          label="Correct Quantity (Packs)" 
          rules={[{ required: true, message: 'Please enter the new count' }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            placeholder="Enter physical count observed in store"
            size="large"
          />
        </Form.Item>
        
        <p style={{ color: '#888', fontSize: '12px' }}>
          * Manual adjustments are logged for audit purposes. This will overwrite the current "Back Room" count.
        </p>
      </Form>
    </Modal>
  );
};

export default AdjustStoreStockModal;