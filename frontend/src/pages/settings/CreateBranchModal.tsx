import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { settingsService } from '../../services/settingsService';
import type { Branch } from '../../types/settings';

interface CreateBranchProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Branch | null;
}

const CreateBranchModal: React.FC<CreateBranchProps> = ({ visible, onCancel, onSuccess, initialValues }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(initialValues || { name: '', location: '' });
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (initialValues?.id) {
        await settingsService.updateBranch(initialValues.id, values);
        message.success('Branch updated successfully');
      } else {
        await settingsService.createBranch(values);
        message.success('New branch added to Sofia ERP');
      }
      onSuccess();
    } catch (error) {
      message.error('Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? "Edit Branch" : "Create New Branch"}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText="Save"
      okButtonProps={{ style: { background: '#4A5B6D', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Branch Name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Bole Branch" />
        </Form.Item>
        <Form.Item name="location" label="Physical Location">
          <Input placeholder="e.g. Addis Ababa, Near Edna Mall" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateBranchModal;