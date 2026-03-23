import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message, Empty } from 'antd';
import { inventoryService } from '../../services/inventoryService';
import type { Vendor, Product } from '../../types/inventory'; // Import Product type

interface CreateProductProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Product | null; // Add this to handle the edit data
}

const CreateProductModal: React.FC<CreateProductProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Sync form with initialValues whenever the modal opens or the record changes
  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

  useEffect(() => {
    if (visible) {
      const fetchVendors = async () => {
        try {
          const response = await inventoryService.getVendors();
          setVendors(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
          setVendors([]);
        }
      };
      fetchVendors();
    }
  }, [visible]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (initialValues?.id) {
        // UPDATE existing product
        await inventoryService.updateProduct(initialValues.id, values);
        message.success('Product updated successfully!');
      } else {
        // CREATE new product
        await inventoryService.createProduct(values);
        message.success('Product created successfully!');
      }
      onSuccess();
    } catch (error) {
      message.error(initialValues?.id ? 'Failed to update product' : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? "Edit Product" : "Create New Product"} // Dynamic Title
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText="Save"
      cancelText="Discard"
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ pieces_per_pack: 1 }}>
        <Form.Item name="name" label="Product Name" rules={[{ required: true, message: 'Please enter product name' }]}>
          <Input placeholder="e.g. Spirit" />
        </Form.Item>

        <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select a category' }]}>
          <Select placeholder="Select category">
            <Select.Option value="KHAT">Khat</Select.Option>
            <Select.Option value="DRINK">Soft Drink</Select.Option>
            <Select.Option value="WATER">Water</Select.Option>
            <Select.Option value="NUTS">Nuts</Select.Option>
            <Select.Option value="CIGARETTE">Cigarette</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="vendor" label="Vendor">
          <Select 
            placeholder="Select a Vendor" 
            showSearch 
            optionFilterProp="children"
            allowClear
            notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Vendors Found" />}
          >
            {(vendors || []).map(v => (
              <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="pieces_per_pack" label="Pack Multiplier (Pieces per Pack)" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="buying_price_per_piece" label="Buying Price (per single piece)" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="ETB" />
        </Form.Item>

        <Form.Item name="selling_price_per_piece" label="Selling Price (per single piece)" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="ETB" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateProductModal;