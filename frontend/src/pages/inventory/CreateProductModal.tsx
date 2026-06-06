import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message, Empty, Divider } from 'antd';
import { inventoryService } from '../../services/inventoryService';
import type { Vendor, Product } from '../../types/inventory';

interface CreateProductProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Product | null;
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

  const isEditing = !!initialValues?.id;

  useEffect(() => {
    if (visible) {
      // 1. Fetch vendors
      inventoryService.getVendors().then(res => {
        setVendors(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setVendors([]));

      // 2. Sync Form Data
      if (initialValues) {
        // We use a zero-timeout to ensure the form instance is ready in the DOM
        setTimeout(() => {
          form.setFieldsValue({
            ...initialValues,
            // CRITICAL: Extract ID if vendor is an object, otherwise the Select remains empty
            vendor: typeof initialValues.vendor === 'object' 
              ? (initialValues.vendor as any)?.id 
              : initialValues.vendor
          });
        }, 0);
      } else {
        form.resetFields();
        form.setFieldsValue({ pieces_per_pack: 1, destination: 'STORE' });
      }
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (isEditing && initialValues?.id) {
        await inventoryService.updateProduct(initialValues.id, values);
        message.success('Product updated successfully!');
      } else {
        await inventoryService.createProduct(values);
        message.success('Product created successfully!');
      }
      onSuccess();
    } catch (error) {
      message.error('Operation failed. Please check your network or inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit Product" : "Create New Product"}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnClose={true}
      okText={isEditing ? "Update Product" : "Save Product"}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      // Ensure modal is fresh on every open
      forceRender
    >
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={onFinish} 
        preserve={false}
      >
        <Form.Item name="name" label="Product Name" rules={[{ required: true, message: 'Name is required' }]}>
          <Input placeholder="e.g. Coca Cola 500ml" />
        </Form.Item>

        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
          <Select placeholder="Select category">
            <Select.Option value="KHAT">Khat</Select.Option>
            <Select.Option value="DRINK">Soft Drink</Select.Option>
            <Select.Option value="WATER">Water</Select.Option>
            <Select.Option value="NUTS">Nuts</Select.Option>
            <Select.Option value="CIGARETTE">Cigarette</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item 
          name="destination" 
          label="Inventory Flow (Destination)" 
          rules={[{ required: true }]}
          extra="Where does this arrive?"
        >
          <Select>
            <Select.Option value="STORE">Store (Warehouse)</Select.Option>
            <Select.Option value="SHOP">Shop (Direct/Khat)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="vendor" label="Primary Vendor">
          <Select 
            placeholder="Select a Vendor" 
            showSearch 
            allowClear
            optionFilterProp="children"
          >
            {vendors.map(v => (
              <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }}>Pricing & Packaging</Divider>

        <Form.Item name="pieces_per_pack" label="Pieces per Pack" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="buying_price_per_piece" label="Buying Price (Single Piece)" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="ETB" />
        </Form.Item>

        <Form.Item name="selling_price_per_piece" label="Selling Price (Single Piece)" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="ETB" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateProductModal;