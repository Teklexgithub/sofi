import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { inventoryService } from '../../services/inventoryService';

interface CreateVendorProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: any; // Add this to handle the edit data
}

const CreateVendorModal: React.FC<CreateVendorProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Sync the form with initialValues whenever the modal opens or the record changes
  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (initialValues?.id) {
        // If there's an ID, we are UPDATING
        await inventoryService.updateVendor(initialValues.id, values);
        message.success('Vendor updated in Sofia ERP');
      } else {
        // If there's no ID, we are CREATING
        await inventoryService.createVendor(values);
        message.success('Vendor added to Sofia ERP');
      }
      onSuccess();
    } catch (error) {
      message.error(initialValues?.id ? 'Failed to update vendor' : 'Failed to create vendor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? "Edit Vendor" : "Add New Vendor"} // Dynamic Title
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText="Save"
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Vendor Name" rules={[{ required: true, message: 'Required' }]}>
          <Input placeholder="e.g. BGI Ethiopia" />
        </Form.Item>

        <Form.Item name="contact_person" label="Contact Person">
          <Input placeholder="e.g. Ato Abebe" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateVendorModal;