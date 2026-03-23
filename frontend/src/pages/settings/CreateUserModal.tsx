import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { settingsService } from '../../services/settingsService';
import type { Branch, UserAccount } from '../../types/settings';

interface CreateUserProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: UserAccount | null;
}

const CreateUserModal: React.FC<CreateUserProps> = ({ visible, onCancel, onSuccess, initialValues }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (visible) {
      // Fetch branches to populate the assignment dropdown
      settingsService.getBranches().then(res => setBranches(res.data));
      form.setFieldsValue(initialValues || { role: 'SALES' });
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (initialValues?.id) {
        await settingsService.updateUser(initialValues.id, values);
        message.success('User updated');
      } else {
        // Ensure you handle password separately if your API requires it
        await settingsService.createUser({ ...values, password: 'TemporaryPassword123!' });
        message.success('User created with default password');
      }
      onSuccess();
    } catch (error) {
      message.error('Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? "Edit User" : "Create New User"}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText="Save"
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input placeholder="email@sofiaerp.com" />
        </Form.Item>
        <Form.Item name="username" label="Username" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="ADMIN">Admin/Owner</Select.Option>
            <Select.Option value="MANAGER">Branch Manager</Select.Option>
            <Select.Option value="SALES">Sales Person</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="branch" label="Assigned Branch">
          <Select placeholder="Select Branch" allowClear>
            {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;